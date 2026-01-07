import joblib
import numpy as np
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torchvision import transforms
from skimage.color import rgb2gray
from skimage.feature import graycomatrix, graycoprops
from torchvision.models import resnet18, ResNet18_Weights
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import base64
import logging
import time
from functools import wraps
from ultralytics import YOLO

import warnings
warnings.filterwarnings('ignore')
warnings.simplefilter('ignore')
import torch
import cv2
from ultralytics.nn.tasks import DetectionModel

def letterbox(im, new_shape=(640, 640), color=(114, 114, 114), auto=True, scaleFill=False, scaleup=True, stride=32):
    # Resize and pad image while meeting stride-multiple constraints
    shape = im.shape[:2]  # current shape [height, width]
    if isinstance(new_shape, int):
        new_shape = (new_shape, new_shape)

    r = min(new_shape[0] / shape[0], new_shape[1] / shape[1])
    if not scaleup:  # only scale down, do not scale up (for better val mAP)
        r = min(r, 1.0)

    ratio = r, r
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = new_shape[1] - new_unpad[0], new_shape[0] - new_unpad[1]  # wh padding
    if auto:  # minimum rectangle
        dw, dh = np.mod(dw, stride), np.mod(dh, stride)  # wh padding
    elif scaleFill:  # stretch
        dw, dh = 0.0, 0.0
        new_unpad = (new_shape[1], new_shape[0])
        ratio = new_shape[1] / shape[1], new_shape[0] / shape[0]

    dw /= 2  # divide padding into 2 sides
    dh /= 2

    if shape[::-1] != new_unpad:  # resize
        im = cv2.resize(im, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    im = cv2.copyMakeBorder(im, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)  # add border
    return im, ratio, (dw, dh)

class yolov8_heatmap:
    def __init__(self, weight, method, conf_threshold=0.2, ratio=0.02, show_box=True):
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = YOLO(weight)
        self.model_pt = self.model.model
        self.model_pt.to(device)
        self.model_pt.eval() # set to evaluation mode
        
        self.target_layers = [self.model_pt.model[-2]] # usually the last detect layer
        self.method = method
        self.conf_threshold = conf_threshold
        self.ratio = ratio
        self.show_box = show_box
        self.device = device
        
    def post_process(self, result):
        # Placeholder for simple post-processing logic needed for visualization
        # In a full implementation, this extracts bounding boxes
        return result

    def draw_detections(self, box, score, class_id, img):
        # Draw bounding boxes on the image
        x1, y1, x2, y2 = map(int, box)
        cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(img, f"{self.model.names[int(class_id)]} {score:.2f}", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        return img

    def __call__(self, img_path):
        img = cv2.imread(img_path)
        img = cv2.resize(img, (640, 640)) # simple resize for demo
        
        # 1. Run inference to get boxes
        results = self.model(img_path, conf=self.conf_threshold)
        boxes = results[0].boxes
        
        # 2. Hook into gradients (Simplified GradCAM Logic)
        # Note: True GradCAM requires hooking into backward pass. 
        # For simplicity, we will visualize the Feature Maps of the last layer directly
        # which is often referred to as "Activation Mapping" or EigenCAM
        
        target_layer = self.model_pt.model[-2] # One of the detection heads
        activations = []
        def hook_fn(module, input, output):
            activations.append(output)
        
        handle = target_layer.register_forward_hook(hook_fn)
        
        # Run forward pass again to capture activations
        img_tensor = torch.from_numpy(img).to(self.device).float() / 255.0
        img_tensor = img_tensor.permute(2, 0, 1).unsqueeze(0)
        with torch.no_grad():
            self.model_pt(img_tensor)
        handle.remove()
        
        # Process activations
        act = activations[0] # [batch, channels, h, w]
        if isinstance(act, list): act = act[0] # handle if list
        
        # Calculate heatmap (Sum of absolute values across channels)
        heatmap = torch.mean(torch.abs(act), dim=1).squeeze().cpu().numpy()
        
        # Normalize heatmap
        heatmap = (heatmap - heatmap.min()) / (heatmap.max() - heatmap.min())
        heatmap = cv2.resize(heatmap, (img.shape[1], img.shape[0]))
        heatmap = np.uint8(255 * heatmap)
        heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
        
        # Overlay
        superimposed_img = cv2.addWeighted(heatmap, 0.5, img, 0.5, 0)
        
        # Draw boxes from initial inference
        if self.show_box:
            for box in boxes:
                xyxy = box.xyxy[0].cpu().numpy()
                cls = box.cls[0].cpu().numpy()
                conf = box.conf[0].cpu().numpy()
                superimposed_img = self.draw_detections(xyxy, conf, cls, superimposed_img)
                
        return superimposed_img

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

glcm_features = []
resnet_features = []
pca_features = []
image_name = []
classification = []


# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCALER_PATH = os.path.join(BASE_DIR, 'minmax_scaler.pkl')
MODEL_PATH = os.path.join(BASE_DIR, 'ann_model_state_dict.pth')

# Upload configuration
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = int(os.getenv('MAX_CONTENT_LENGTH', 8 * 1024 * 1024))  # 8MB limit

# Allowed file extensions
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

# Rate limiting decorator
def rate_limit(max_requests=60, window=60):
    def decorator(f):
        requests = {}
        @wraps(f)
        def decorated_function(*args, **kwargs):
            client_ip = request.remote_addr
            now = time.time()
            
            # Clean old entries
            requests[client_ip] = [req_time for req_time in requests.get(client_ip, []) if now - req_time < window]
            
            # Check rate limit
            if len(requests.get(client_ip, [])) >= max_requests:
                return jsonify({'error': 'Rate limit exceeded'}), 429
            
            # Add current request
            requests[client_ip].append(now)
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

import os
import numpy as np
from PIL import Image
from skimage.color import rgb2gray
from skimage.feature import graycomatrix, graycoprops

class GLCMFeatureExtractor:
    def __init__(self, distances=[50], angles=[np.pi/2], levels=256, props=None):
        self.distances = distances
        self.angles = angles
        self.levels = levels
        self.props = props or ['contrast', 'dissimilarity', 'homogeneity', 'energy', 'correlation']
        self.feature_names = [f"{prop.capitalize()}" for prop in self.props]

    def extract_from_image(self, image_path):
        image = self._load_image(image_path)
        glcm = graycomatrix(image, 
                            distances=self.distances,
                            angles=self.angles,
                            levels=self.levels)
        
        features = {}
        for prop in self.props:
            value = graycoprops(glcm, prop)[0, 0]
            features[prop.capitalize()] = value
        
        return features

    def _load_image(self, image_path):
        im_frame = Image.open(image_path).convert("RGB")
        gray_image = rgb2gray(np.array(im_frame))
        return (gray_image * 255).astype(np.uint8)

# Use the extractor
def classify_contamination(img_path):
    extractor = GLCMFeatureExtractor()
    return extractor.extract_from_image(img_path)

import torch, random, numpy as np

torch.manual_seed(42)
np.random.seed(42)
random.seed(42)
torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

class ChannelAttention(nn.Module):
    def __init__(self, in_planes, ratio=16):
        super().__init__()
        self.avg_pool = nn.AdaptiveAvgPool2d(1)
        self.max_pool = nn.AdaptiveMaxPool2d(1)
        self.fc = nn.Sequential(
            nn.Linear(in_planes, in_planes // ratio, bias=False),
            nn.ReLU(inplace=True),
            nn.Linear(in_planes // ratio, in_planes, bias=False)
        )
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        b, c, _, _ = x.size()
        avg_out = self.fc(self.avg_pool(x).flatten(1))
        max_out = self.fc(self.max_pool(x).flatten(1))
        out = avg_out + max_out
        return self.sigmoid(out).view(b, c, 1, 1)

class SpatialAttention(nn.Module):
    def __init__(self, kernel_size=7):
        super().__init__()
        self.conv = nn.Conv2d(2, 1, kernel_size, padding=kernel_size // 2, bias=False)
        self.sigmoid = nn.Sigmoid()

    def forward(self, x):
        avg_out = torch.mean(x, dim=1, keepdim=True)
        max_out, _ = torch.max(x, dim=1, keepdim=True)
        x_cat = torch.cat([avg_out, max_out], dim=1)
        return self.sigmoid(self.conv(x_cat))

class CBAM(nn.Module):
    def __init__(self, in_planes, ratio=16, kernel_size=7):
        super().__init__()
        self.ca = ChannelAttention(in_planes, ratio)
        self.sa = SpatialAttention(kernel_size)

    def forward(self, x):
        x = x * self.ca(x)
        x = x * self.sa(x)
        return x
    
class ResNet18_CBAM_FeatureExtractor(nn.Module):
    def __init__(self):
        super().__init__()
        base_model = resnet18(weights=ResNet18_Weights.DEFAULT)
        self.features = nn.Sequential(
            base_model.conv1,
            base_model.bn1,
            base_model.relu,
            base_model.maxpool,
            base_model.layer1,
            CBAM(64),
            base_model.layer2,
            CBAM(128),
            base_model.layer3,
            CBAM(256),
            base_model.layer4,
            CBAM(512)
        )
        self.pool = nn.AdaptiveAvgPool2d((1, 1))

    def forward(self, x):
        x = self.features(x)
        x = self.pool(x)
        return torch.flatten(x, 1)
    
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ResNet18_CBAM_FeatureExtractor().to(device)
model.eval()

def extract_deep_features(image_path):
    try:
        image = Image.open(image_path).convert("RGB")
    except Exception as e:
        print(f"Error loading {image_path}: {e}")
        return None

    img_tensor = transform(image).unsqueeze(0).to(device)
    with torch.no_grad():
        features = model(img_tensor).cpu().squeeze(0).numpy()
    return features

class ANN(nn.Module):
    def __init__(self):
        super(ANN, self).__init__()
        self.fc1 = nn.Linear(517, 256)
        self.relu1 = nn.ReLU()
        self.dropout1 = nn.Dropout(0.3)
        self.fc2 = nn.Linear(256, 128)
        self.relu2 = nn.ReLU()
        self.dropout2 = nn.Dropout(0.3)
        self.output = nn.Linear(128, 3)  # adjust to 2 for binary, more for multiclass

    def forward(self, x):
        x = self.dropout1(self.relu1(self.fc1(x)))
        x = self.dropout2(self.relu2(self.fc2(x)))
        return self.output(x)
    
# Global model variables for caching
SCALER = None
ANN_MODEL = None
YOLO_MODEL = None
HEATMAP_GENERATOR = None

def load_models():
    """Load models at startup for better performance"""
    global SCALER, ANN_MODEL, YOLO_MODEL, HEATMAP_GENERATOR
    
    try:
        SCALER = joblib.load(SCALER_PATH)
        logger.info(f"Loaded scaler from {SCALER_PATH}")
    except Exception as e:
        logger.error(f"Failed to load scaler: {e}")
        raise
    
    try:
        ANN_MODEL = ANN()
        ANN_MODEL.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        ANN_MODEL.eval()
        logger.info(f"Loaded ANN model from {MODEL_PATH}")
    except Exception as e:
        logger.error(f"Failed to load ANN model: {e}")
        raise

    try:
        logger.info("Attempting to load YOLO model...")
        YOLO_MODEL = YOLO("best.pt")
        logger.info(f"Successfully loaded YOLO model from best.pt")
        # Test the model with a simple prediction to ensure it's working
        logger.info("YOLO model loaded and ready")
    except Exception as e:
        logger.error(f"Failed to load YOLO model: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        # Don't raise exception, just log the error and continue without YOLO
        YOLO_MODEL = None

    try:
        logger.info("Attempting to load heatmap generator...")
        HEATMAP_GENERATOR = yolov8_heatmap("best.pt", method="EigenCAM", show_box=False)
        logger.info("Successfully loaded heatmap generator")
    except Exception as e:
        logger.error(f"Failed to load heatmap generator: {e}")
        logger.error(f"Error type: {type(e).__name__}")
        # Don't raise exception, just log the error and continue without heatmap generator
        HEATMAP_GENERATOR = None


def detect(img_path):
    """Detect if fruiting bag is present in the image"""
    if YOLO_MODEL is None:
        logger.warning("YOLO model not loaded, skipping bag detection")
        return True  # Skip detection if YOLO model is not available
    
    try:
        results = YOLO_MODEL.predict(img_path)
        if results and len(results) > 0 and results[0].boxes is not None:
            return any(results[0].names[int(box.cls[0])] == "bag" for box in results[0].boxes)
        return False
    except Exception as e:
        logger.error(f"YOLO detection error: {e}")
        return True  # Skip detection on error


def classify(img_path):
    """Classify mushroom contamination with error handling"""
    try:
        glcm_features = list(classify_contamination(img_path).values())
        resnet_features = extract_deep_features(img_path)
        
        if resnet_features is None:
            raise ValueError("Failed to extract deep features")
        
        features = np.concatenate((glcm_features, resnet_features), axis=0).reshape(1, -1)
        features_scaled = SCALER.transform(features)
        
        input_tensor = torch.tensor(features_scaled, dtype=torch.float32).to(device)
        
        with torch.no_grad():
            logits = ANN_MODEL(input_tensor)
            probs = F.softmax(logits, dim=1)
            predicted_class = torch.argmax(probs, dim=1).item()
            confidence = torch.max(probs).item()
        
        return predicted_class, confidence
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise

@app.route('/api/upload', methods=['POST'])
@rate_limit(max_requests=60, window=60)  # 5 requests per minute
def upload_image():
    """Upload and classify mushroom image with security checks"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        image = request.files['image']
        
        if image.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(image.filename):
            return jsonify({'error': 'File type not allowed. Use: PNG, JPG, JPEG, BMP, GIF'}), 400

        # Secure filename
        filename = secure_filename(image.filename)
        if not filename:
            filename = f"upload_{int(time.time())}.jpg"
        
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save original image
        image.save(image_path)
        
        # Create a copy for processing (resized)
        img_original = Image.open(image_path).convert("RGB")
        img_processed = img_original.copy()
        img_processed = img_processed.resize((224, 224))
        
        # Save processed image for classification
        processed_path = os.path.join(app.config['UPLOAD_FOLDER'], f"processed_{filename}")
        img_processed.save(processed_path)
        
        # Classify using processed image
        if detect(processed_path):
            _class, _confidence = classify(processed_path)
        else:
            # Clean up uploaded files
            try:
                os.remove(image_path)  # Original image
                os.remove(processed_path)  # Processed image
            except:
                pass
            
            return jsonify({
                'error': 'No fruiting bag detected in the image',
                'status': 'error'
            }), 400
            
        
        # Encode original image to base64 (without resizing)
        with open(image_path, "rb") as f:
            img_bytes = f.read()
            img_base64 = base64.b64encode(img_bytes).decode("utf-8")
        
        # Clean up uploaded files
        try:
            os.remove(image_path)  # Original image
            os.remove(processed_path)  # Processed image
        except:
            pass
        
        # Return result with image
        return jsonify({
            'result': _class,
            'confidence': round(_confidence, 3),
            'image': img_base64,
            'status': 'success'
        })
        
    except Exception as e:
        logger.error(f"Upload error: {e}")
        return jsonify({'error': 'Processing failed'}), 500

@app.route('/api/heatmap', methods=['POST'])
@rate_limit(max_requests=60, window=60)
def generate_heatmap():
    """Generate heatmap visualization for an image"""
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400

        image = request.files['image']
        
        if image.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(image.filename):
            return jsonify({'error': 'File type not allowed. Use: PNG, JPG, JPEG, BMP, GIF'}), 400

        if HEATMAP_GENERATOR is None:
            return jsonify({'error': 'Heatmap generator not available'}), 503

        # Secure filename
        filename = secure_filename(image.filename)
        if not filename:
            filename = f"heatmap_{int(time.time())}.jpg"
        
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        # Save image temporarily
        image.save(image_path)
        
        try:
            # Generate heatmap
            heatmap_img = HEATMAP_GENERATOR(image_path)
            
            # Encode heatmap image to base64
            _, buffer = cv2.imencode('.jpg', heatmap_img)
            img_base64 = base64.b64encode(buffer).decode("utf-8")
            
            return jsonify({
                'image': img_base64,
                'status': 'success'
            })
        finally:
            # Clean up uploaded file
            try:
                os.remove(image_path)
            except:
                pass
        
    except Exception as e:
        logger.error(f"Heatmap generation error: {e}")
        return jsonify({'error': 'Heatmap generation failed'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring"""
    try:
        # Check if models are loaded
        if SCALER is None or ANN_MODEL is None:
            return jsonify({
                'status': 'unhealthy',
                'message': 'Core models not loaded'
            }), 503
        
        # Check YOLO model status
        yolo_status = "loaded" if YOLO_MODEL is not None else "not loaded"
        
        return jsonify({
            'status': 'healthy',
            'message': 'Service is running',
            'domain': 'reliably-one-kiwi.ngrok-free.app',
            'models': {
                'scaler': 'loaded',
                'ann_model': 'loaded',
                'yolo_model': yolo_status
            }
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'message': str(e)
        }), 503

@app.route('/', methods=['GET'])
def home():
    """API information endpoint"""
    return jsonify({
        'service': 'Shroomify Backend API',
        'version': '1.0.0',
        'endpoints': {
            'upload': '/api/upload',
            'health': '/health'
        },
        'domain': 'reliably-one-kiwi.ngrok-free.app'
    })

if __name__ == '__main__':
    # Load models at startup
    try:
        load_models()
        logger.info("Models loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        exit(1)
    
    # Production configuration
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    port = int(os.getenv('PORT', 5000))
    host = os.getenv('HOST', '0.0.0.0')
    
    logger.info(f"Starting Shroomify API on {host}:{port}")
    logger.info(f"Debug mode: {debug_mode}")
    logger.info(f"Domain: reliably-one-kiwi.ngrok-free.app")
    
    app.run(host=host, port=port, debug=debug_mode)
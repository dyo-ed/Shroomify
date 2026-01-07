# SHROOMIFY - Image-Based Contamination Classification

<div align=justify>

🍄**Shroomify is an image-based contamination classification system that uses modified feature engineering and artificial neural networks to detect early contamination in mushroom fruiting bags.**  

This system is developed as part of a **Bachelor of Science in Computer Science thesis project**


- **Image-based pipeline**: Users capture or upload a photo of a mushroom fruiting bag, which is then processed by the model.  
- **Modified feature engineering**: The system extracts handcrafted features (such as texture and intensity patterns) and combines them with deep features from a convolutional backbone to better capture subtle contamination cues.  
- **Artificial neural network (ANN)**: A dedicated ANN classifier takes these combined features and predicts whether a bag is likely **clean** or **contaminated**, along with a confidence score.  
- **Early warning focus**: The model is tuned for **early-stage contamination**, where small, local changes in the substrate or mycelium can still be addressed, helping reduce losses and improve yield.  

</div>

## 📦 Installation & Local Development (Frontend)

#### 1. Install dependencies
```bash
npm install
```

#### 2. Run the development server
```bash
npm run dev
```

## 🚀 Deployment (Vercel)

#### 1. Build the project (optional – Vercel can build automatically)
```bash
npm run build
```

#### 2. Deploy to Vercel
```bash
vercel
```

Follow the interactive prompts or connect the repository to your Vercel dashboard and configure it to run `npm install` and `npm run build` as the build step.

---

## 🚀 Production-Ready Backend

**Domain:** `your_domain.ngrok-free.app`

### Quick Start

#### Prerequisites
- Python 3.8+
- ngrok account and authtoken
- Model files: `ann_model_state_dict.pth` and `minmax_scaler.pkl`

#### 1. Install ngrok
```bash
# Download and install ngrok from https://ngrok.com/download
# Set your authtoken
ngrok config add-authtoken YOUR_AUTHTOKEN
```

#### 2. Deploy Backend
```bash
# Windows
deploy.bat

# Linux/Mac
chmod +x deploy.sh
./deploy.sh
```

#### 3. Manual Start
```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_DEBUG=False
export PORT=5000

# Start with ngrok
python start_ngrok.py
```

## 🔧 API Endpoints

### 🏠 Home
- **URL:** `https://reliably-one-kiwi.ngrok-free.app/`
- **Method:** GET
- **Response:** API information

### 🏥 Health Check
- **URL:** `https://reliably-one-kiwi.ngrok-free.app/health`
- **Method:** GET
- **Response:** Service health status

### 📤 Image Upload
- **URL:** `https://reliably-one-kiwi.ngrok-free.app/api/upload`
- **Method:** POST
- **Content-Type:** multipart/form-data
- **Body:** `image` (file)
- **Response:**
```json
{
  "result": 0,
  "confidence": 0.95,
  "image": "base64_encoded_image",
  "status": "success"
}
```

## 🛡️ Security Features

- ✅ File type validation (PNG, JPG, JPEG, BMP, GIF)
- ✅ File size limits (8MB max)
- ✅ Rate limiting (5 requests/minute)
- ✅ Secure filename handling
- ✅ Automatic file cleanup
- ✅ Input validation
- ✅ Error handling

## 🧠 Machine Learning Features

- **YOLO Detection**: Bag detection before classification
- **GLCM Features**: Texture analysis for contamination
- **ResNet18 + CBAM**: Deep learning feature extraction
- **ANN Classification**: Final contamination prediction
- **Model Caching**: Optimized performance

## 📦 Configuration

Environment variables:
- `FLASK_DEBUG`: Enable debug mode (default: False)
- `PORT`: Server port (default: 5000)
- `HOST`: Server host (default: 0.0.0.0)
- `MAX_CONTENT_LENGTH`: Max upload size in bytes (default: 8MB)

## 🏥 Monitoring

- **Health Check:** `https://reliably-one-kiwi.ngrok-free.app/health`
- **Logs:** Check console output for detailed logs
- **Rate Limits:** 5 requests per minute per IP

## 🚀 Frontend

The repository also includes a Next.js frontend application with:
- Modern React components
- Authentication system
- Image upload interface
- Results visualization
- User profile management

## 📋 Project Structure

```
shroomify/
├── backend/                 # Flask API
│   ├── app.py              # Main application
│   ├── requirements.txt   # Python dependencies
│   ├── deploy.bat         # Windows deployment
│   ├── deploy.sh          # Linux/Mac deployment
│   └── README.md          # Backend documentation
├── src/                    # Next.js frontend
│   ├── app/               # App router pages
│   ├── lib/               # Utilities and contexts
│   └── components/         # React components
├── public/                 # Static assets
└── README.md              # This file
```

## 🔧 Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
python app.py
```

### Frontend Development
```bash
npm install
npm run dev
```

## 🚀 Deployment

### Backend (ngrok)
```bash
cd backend
deploy.bat  # Windows
./deploy.sh # Linux/Mac
```

### Frontend (Vercel)
```bash
npm run build
vercel deploy
```

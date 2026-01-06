const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbys311YfJOHNDjgTAtjxlfhMJgHXWeYr1Al5chnNzmrnji9kUc94EOC_baCytfFshwh/exec'; 
const loader = document.getElementById('loader');
const DEFAULT_LINKEDIN = "http://linkedin.com/in/rendynurf452";

// ===============================================
// THREE.JS REALISTIC IMPLEMENTATION
// ===============================================
let scene, camera, renderer;
let earthGroup, earthMesh, cloudsMesh, moonGroup, moonMesh, starsMesh;
let sunLight, ambientLight;

// KONFIGURASI ROTASI:
const ASIA_VIEW_ROTATION = 1.25; 

function init3D() {
    const canvas = document.getElementById('universeCanvas');
    
    // Scene Setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 30; 

    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const textureLoader = new THREE.TextureLoader();

    earthGroup = new THREE.Group();
    earthGroup.rotation.y = 2.6; 
    scene.add(earthGroup);

    // Earth Mesh
    const earthGeo = new THREE.SphereGeometry(8, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg'),
        bumpMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-topology.png'),
        bumpScale: 0.65,
        specularMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-water.png'),
        emissiveMap: textureLoader.load('https://unpkg.com/three-globe/example/img/earth-night.jpg'),
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.1,
        shininess: 15
    });
    earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Clouds
    const cloudGeo = new THREE.SphereGeometry(8.1, 64, 64);
    const cloudMat = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    cloudsMesh = new THREE.Mesh(cloudGeo, cloudMat);
    earthGroup.add(cloudsMesh);

    // --- MOON ---
    moonGroup = new THREE.Group(); 
    scene.add(moonGroup);

    const moonGeo = new THREE.SphereGeometry(2, 32, 32);
    const moonMat = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg'),
        shininess: 0
    });
    moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(20, 0, 0); 
    moonGroup.add(moonMesh);

    // Lighting & Stars
    ambientLight = new THREE.AmbientLight(0x404040, 0.2);
    scene.add(ambientLight);
    sunLight = new THREE.DirectionalLight(0xffffff, 1.8);
    scene.add(sunLight);

    const starGeo = new THREE.BufferGeometry();
    const starCount = 2000;
    const starPos = new Float32Array(starCount * 3);
    for(let i=0; i<starCount*3; i++) starPos[i] = (Math.random() - 0.5) * 800;
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, transparent: true, opacity: 0.8 });
    starsMesh = new THREE.Points(starGeo, starMat);
    scene.add(starsMesh);

    animate();
}

// --- SCROLL LOGIC ---
let targetZ = 30;
let targetY = 0;

window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 100) {
        targetZ = 16; 
        targetY = -6; 
    } else {
        targetZ = 30; 
        targetY = 0; 
    }
});

function animate() {
    requestAnimationFrame(animate);
    
    const now = new Date();

    // --- 1. MATAHARI (WAKTU HARIAN WIB) ---
    const utcHours = now.getUTCHours();
    const wibHours = (utcHours + 7) % 24; 
    const minutes = now.getMinutes();
    const totalHours = wibHours + (minutes / 60);

    // MATAHARI: Terbit dari Timur (Negatif)
    const sunAngle = -((totalHours - 12) / 24) * Math.PI * 2; 
    const sunDistance = 60;
    
    if(sunLight) {
        sunLight.position.x = Math.sin(sunAngle) * sunDistance; 
        sunLight.position.z = Math.cos(sunAngle) * sunDistance; 
        sunLight.position.y = Math.cos(sunAngle * 0.5) * 10;
    }

    // --- 2. BULAN (FASE REALTIME) ---
    const lunarPhaseAngle = getRealtimeLunarPhase(now);
    
    if(moonGroup) {
        // POSISI BULAN: Mengikuti arah matahari (negatif) dengan offset agar tidak tertutup bumi
        moonGroup.rotation.y = -sunAngle + Math.PI/2 - lunarPhaseAngle;
    }

    if(moonMesh) {
         moonMesh.rotation.y = -Math.PI / 2; 
    }

    // --- LOGIKA LAINNYA ---
    const dayNightRatio = (Math.cos(sunAngle) + 1) / 2; 
    const nightIntensity = 1 - dayNightRatio;

    if (earthMesh && earthMesh.material) {
        const targetEmissive = 0.05 + (Math.pow(nightIntensity, 4) * 2.5);
        earthMesh.material.emissiveIntensity += (targetEmissive - earthMesh.material.emissiveIntensity) * 0.1;
    }

    if(ambientLight) {
        const targetAmbient = 0.05 + (dayNightRatio * 0.15);
        ambientLight.intensity += (targetAmbient - ambientLight.intensity) * 0.1;
    }

    if(cloudsMesh) cloudsMesh.rotation.y += 0.0004; 
    if(starsMesh) starsMesh.rotation.y -= 0.0001;

    if(camera && earthGroup) {
        camera.position.z += (targetZ - camera.position.z) * 0.05;
        earthGroup.position.y += (targetY - earthGroup.position.y) * 0.05;
    }

    renderer.render(scene, camera);
}

// Fungsi Fase Bulan
function getRealtimeLunarPhase(date) {
    const newMoonRef = new Date('2000-01-06T18:14:00');
    const oneDay = 1000 * 60 * 60 * 24;
    const synodicMonth = 29.53058867;
    const diffTime = date.getTime() - newMoonRef.getTime();
    const diffDays = diffTime / oneDay;
    const currentPhase = (diffDays % synodicMonth) / synodicMonth;
    return currentPhase * Math.PI * 2;
}

window.addEventListener('resize', () => {
    if(camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        targetZ = (window.innerWidth < 768) ? 45 : 30; 
    }
});

init3D();

// ===============================================
// LOGIC & DATA HANDLING
// ===============================================

const MOCK_DATA = {
    Profile: [{
        Name: "Rendy Nur Firmansyah",
        Bio: "Fresh Graduate with a passion for Web Development and Data Analysis. Creating seamless digital experiences.",
        Role: "Web Developer, Data Analyst",
        PhotoURL: "https://via.placeholder.com/350x450", 
        LinkedIn: DEFAULT_LINKEDIN,
        Email: "rendy@example.com"
    }],
    Education: [{ Institution: "University of Technology", Degree: "B.S. Computer Science", Year: "2019 - 2023", Description: "Graduated with Honors. Specialized in Software Engineering." }],
    Experience: [{ Position: "Frontend Dev", Company: "Tech Corp", Duration: "2023 - Present", Description: "Developing responsive UI using React & Tailwind." }],
    Organization: [{ OrganizationName: "Student Union", Role: "Head of IT", Year: "2021", Description: "Managed campus events." }],
    Projects: [{ Title: "E-Commerce Web", Category: "Web App", Description: "Fullstack MERN Application.", ImageURL: "", Link: "#" }],
    Achievements: [{ Title: "Best Code 2023", Description: "Awarded by Google Developer Student Club.", ImageURL: "" }],
    Certificates: [{ Title: "JS Algorithms", Issuer: "FreeCodeCamp", ImageURL: "" }]
};

function convertToDirectLink(url) {
    if (!url) return '';
    if (!url.includes('drive.google.com')) return url;
    let id = '';
    const parts = url.split('/');
    if (url.includes('/d/')) {
        const dIndex = parts.indexOf('d');
        if (dIndex !== -1 && parts.length > dIndex + 1) id = parts[dIndex + 1];
    } else if (url.includes('id=')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match) id = match[1];
    }
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w1000`;
    return url;
}

// --- MODAL LOGIC ---
function openModal(imgSrc, title, desc, link) {
    if(!imgSrc || imgSrc.includes('placeholder')) return;
    const modal = document.getElementById('imgModal');
    document.getElementById('modalImage').src = imgSrc;
    const captionEl = document.getElementById('modalCaption');
    const linkBtn = document.getElementById('modalLinkBtn');
    
    if(title || desc) {
        captionEl.style.display = 'block';
        captionEl.innerHTML = `<h3>${title || ''}</h3><p>${desc || ''}</p>`;
    } else {
        captionEl.style.display = 'none';
    }

    if(link && link !== 'undefined' && link !== '') {
        linkBtn.style.display = 'inline-flex';
        linkBtn.href = link;
    } else {
        linkBtn.style.display = 'none';
    }

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
}

function closeModal() {
    const modal = document.getElementById('imgModal');
    modal.classList.remove('show');
    setTimeout(() => modal.style.display = 'none', 300);
}
window.onclick = e => { if(e.target == document.getElementById('imgModal')) closeModal(); }

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('active'); });
}, { threshold: 0.1 });

// --- FETCH DATA (DENGAN CACHE BUSTING) ---
async function fetchData() {
    try {
        // Cache Busting: Menambahkan parameter waktu agar browser selalu mengambil data baru
        const cacheBuster = '?t=' + new Date().getTime();
        
        console.log("Memulai Fetch Data API...");
        const response = await fetch(SCRIPT_URL + cacheBuster);
        
        if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);
        
        const data = await response.json();
        
        // Validasi sederhana: Cek apakah data memiliki Profile
        if (!data || !data.Profile) {
            throw new Error("Format data API tidak sesuai atau kosong.");
        }

        console.log("Data API Berhasil Dimuat:", data); // Cek di Console Browser
        renderPortfolio(data);
        finishLoading();
        
    } catch (error) {
        console.error('GAGAL MEMUAT DATA API. Menggunakan Mock Data. Detail:', error);
        // Tetap tampilkan Mock Data jika API gagal agar web tidak kosong
        renderPortfolio(MOCK_DATA); 
        finishLoading();
    }
}

function finishLoading() {
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => { 
            loader.style.display = 'none'; 
            document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
        }, 600);
    }, 1000);
}

function renderPortfolio(data) {
    // 1. Profile Rendering
    if(data.Profile?.[0]) {
        const p = data.Profile[0];
        document.getElementById('profileName').textContent = p.Name;
        document.getElementById('profileBio').textContent = p.Bio;
        if(p.PhotoURL) document.getElementById('profileImg').src = convertToDirectLink(p.PhotoURL);
        
        const roles = p.Role ? p.Role.split(',') : ['Professional'];
        document.getElementById('staticRole').innerHTML = roles.map(r => `<span style="display:inline-block; padding:5px 15px; border-radius:20px; background:rgba(255,255,255,0.1); margin:0 5px; font-size:0.9rem;">${r.trim()}</span>`).join('');

        const linkedInUrl = p.LinkedIn || DEFAULT_LINKEDIN;
        let socialsHTML = '';
        socialsHTML += `<a href="${linkedInUrl}" target="_blank" class="social-btn" title="LinkedIn"><i class="fab fa-linkedin-in"></i></a>`;
        if(p.Instagram) socialsHTML += `<a href="${p.Instagram}" target="_blank" class="social-btn" title="Instagram"><i class="fab fa-instagram"></i></a>`;
        if(p.Facebook) socialsHTML += `<a href="${p.Facebook}" target="_blank" class="social-btn" title="Facebook"><i class="fab fa-facebook-f"></i></a>`;
        if(p.Email) socialsHTML += `<a href="mailto:${p.Email}" class="social-btn" title="Email"><i class="fas fa-envelope"></i></a>`;
        document.getElementById('socialLinks').innerHTML = socialsHTML;
    }

    // Helper Render List
    const renderList = (id, items, template) => {
        const el = document.getElementById(id);
        if(el) el.innerHTML = ''; 
        if(el && items && items.length > 0) {
            items.forEach(item => el.innerHTML += template(item));
        }
    };

    const escapeStr = (str) => str ? str.replace(/'/g, "\\'").replace(/"/g, '"').replace(/\n/g, '<br>') : '';

    // 2. Education
    if(data.Education) {
        data.Education.sort((a,b) => (b.Year || '').localeCompare(a.Year || ''));
        renderList('educationList', data.Education, edu => `
            <div class="cv-card reveal">
                <div class="cv-title">${edu.Institution}</div>
                <div><span class="cv-meta">${edu.Degree}</span> <span style="font-size:0.85rem; opacity:0.7;">• ${edu.Year}</span></div>
                <p>${edu.Description}</p>
            </div>
        `);
    }

    // 3. Experience
    renderList('experienceList', data.Experience, exp => `
        <div class="cv-card reveal">
            <div class="cv-title">${exp.Position}</div>
            <div><span class="cv-meta">${exp.Company}</span> <span style="font-size:0.85rem; opacity:0.7;">• ${exp.Duration}</span></div>
            <p>${exp.Description}</p>
        </div>
    `);
    
    // 4. Organization
    renderList('organizationList', data.Organization, org => `
        <div class="cv-card reveal">
            <div class="cv-title">${org.OrganizationName}</div>
            <div><span class="cv-meta">${org.Role}</span> <span style="font-size:0.85rem; opacity:0.7;">• ${org.Year}</span></div>
            <p>${org.Description}</p>
        </div>
    `);

    // Helper Gallery Card
    const createGalleryCard = (item, isClickable = true) => {
        const img = convertToDirectLink(item.ImageURL) || 'https://via.placeholder.com/400x250?text=No+Image';
        const safeTitle = escapeStr(item.Title);
        const safeDesc = escapeStr(item.Description);
        const safeLink = item.Link ? item.Link : '';
        const clickAttr = isClickable ? `onclick="openModal('${img}', '${safeTitle}', '${safeDesc}', '${safeLink}')"` : '';
        
        return `
        <div class="gallery-card" ${clickAttr}>
            <div class="img-wrap">
                <img src="${img}" class="gallery-img" loading="lazy">
                <div class="overlay-icon"><i class="fas fa-expand-alt"></i></div>
            </div>
            <div class="gallery-info">
                <div class="gallery-title">${item.Title}</div>
                ${item.Category ? `<span style="font-size:0.75rem; color:var(--primary); font-weight:600; text-transform:uppercase; margin-bottom:5px;">${item.Category}</span>` : ''}
                ${item.Issuer ? `<span style="font-size:0.8rem; opacity:0.7; margin-bottom:5px;">${item.Issuer}</span>` : ''}
                <div class="gallery-desc" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${item.Description || ''}</div>
            </div>
        </div>`;
    };

    // 5. Projects
    if(data.Projects) {
        // Duplicate data untuk efek marquee seamless jika item sedikit
        const items = data.Projects.length > 3 ? [...data.Projects, ...data.Projects] : data.Projects;
        let html = ''; items.forEach(i => html += createGalleryCard(i, true));
        document.getElementById('projectList').innerHTML = html;
    }
    
    // 6. Achievements
    if(data.Achievements) {
        const items = data.Achievements.length > 3 ? [...data.Achievements, ...data.Achievements] : data.Achievements;
        let html = ''; items.forEach(i => html += createGalleryCard(i, true));
        document.getElementById('achievementList').innerHTML = html;
    }
    
    // 7. Certificates
    if(data.Certificates) {
        const items = data.Certificates.length > 3 ? [...data.Certificates, ...data.Certificates] : data.Certificates;
        let html = ''; items.forEach(i => html += createGalleryCard(i, true));
        document.getElementById('certificateList').innerHTML = html;
    }
}

fetchData();
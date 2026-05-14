import * as THREE from 'three';

export function initThreeScene(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // Create a floating AI Orb
    const geometry = new THREE.IcosahedronGeometry(1.5, 3);
    const material = new THREE.MeshPhongMaterial({
        color: 0x6366f1,
        emissive: 0x2e1065,
        specular: 0xffffff,
        shininess: 100,
        transparent: true,
        opacity: 0.9,
        wireframe: true
    });
    
    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x6366f1, 2);
    blueLight.position.set(-5, -5, 2);
    scene.add(blueLight);

    const accentLight = new THREE.PointLight(0x8b5cf6, 2);
    accentLight.position.set(0, 5, 0);
    scene.add(accentLight);

    camera.position.z = 5;

    function animate() {
        requestAnimationFrame(animate);
        
        orb.rotation.y += 0.005;
        orb.rotation.z += 0.002;
        
        // Floating effect
        orb.position.y = Math.sin(Date.now() * 0.001) * 0.2;
        
        renderer.render(scene, camera);
    }

    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    return { scene, orb };
}

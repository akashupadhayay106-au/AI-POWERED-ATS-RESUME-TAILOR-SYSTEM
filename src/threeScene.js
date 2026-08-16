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

    // Create a floating AI Orb with better material
    const geometry = new THREE.IcosahedronGeometry(1.5, 4);
    const material = new THREE.MeshPhysicalMaterial({
        color: 0x6366f1,
        emissive: 0x2e1065,
        metalness: 0.9,
        roughness: 0.1,
        ior: 2.5,
        thickness: 0.5,
        transmission: 0.5,
        transparent: true,
        opacity: 0.8,
        wireframe: false
    });
    
    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    // Wireframe overlay
    const wireframeGeom = new THREE.IcosahedronGeometry(1.55, 4);
    const wireframeMat = new THREE.MeshBasicMaterial({
        color: 0x8b5cf6,
        wireframe: true,
        transparent: true,
        opacity: 0.2
    });
    const wireframe = new THREE.Mesh(wireframeGeom, wireframeMat);
    orb.add(wireframe);

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const blueLight = new THREE.PointLight(0x6366f1, 150);
    blueLight.position.set(-5, -5, 2);
    scene.add(blueLight);

    const accentLight = new THREE.PointLight(0x8b5cf6, 150);
    accentLight.position.set(0, 5, 0);
    scene.add(accentLight);

    camera.position.z = 5;

    // Mouse movement interaction
    let mouseX = 0;
    let mouseY = 0;
    window.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX / window.innerWidth) - 0.5;
        mouseY = (e.clientY / window.innerHeight) - 0.5;
    });

    function animate() {
        requestAnimationFrame(animate);
        
        orb.rotation.y += 0.005;
        orb.rotation.z += 0.002;
        
        // Interaction with mouse
        orb.rotation.x += (mouseY * 0.05 - orb.rotation.x) * 0.1;
        orb.rotation.y += (mouseX * 0.05 - orb.rotation.y) * 0.1;
        
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

    window.triggerOrbReaction = (type) => {
        if (type === 'parse') {
            material.color.setHex(0x8b5cf6);
            let t = 0;
            const timer = setInterval(() => {
                orb.rotation.y += 0.05;
                const scaleVal = 1.0 + Math.sin(t * 0.3) * 0.15;
                orb.scale.set(scaleVal, scaleVal, scaleVal);
                t += 1;
                if (t > 50) {
                    clearInterval(timer);
                    orb.scale.set(1, 1, 1);
                    material.color.setHex(0x6366f1);
                }
            }, 16);
        } else if (type === 'success') {
            material.color.setHex(0x10b981);
            setTimeout(() => {
                material.color.setHex(0x6366f1);
            }, 2000);
        } else if (type === 'error') {
            material.color.setHex(0xef4444);
            setTimeout(() => {
                material.color.setHex(0x6366f1);
            }, 2000);
        }
    };

    return { scene, orb };
}

(() => {
    const section = document.querySelector('.scene');
    const canvas = document.getElementById('sceneCanvas');
    if (!section || !canvas) return;

    const sticky = section.querySelector('.scene-sticky');
    const title = document.getElementById('sceneTitle');
    const linesSvg = document.getElementById('sceneLines');
    const bar = document.getElementById('sceneBar');
    const steps = [...section.querySelectorAll('.scene-step')];
    const labelEls = [...section.querySelectorAll('.scene-label')];
    const motionOff = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const lite = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
    const weak = lite || (navigator.hardwareConcurrency || 8) <= 4;
    const useStatic = () => section.classList.add('scene-static');
    if (!window.THREE) {
        useStatic();
        return;
    }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: !weak,
            alpha: true,
            powerPreference: 'high-performance',
        });
    } catch (error) {
        useStatic();
        return;
    }
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5);
    renderer.setPixelRatio(basePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;

    const CYAN = 0x19d8f5;
    const PINK = 0xff4fa3;
    const FOV = 28;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 200);
    const rig = new THREE.Group();
    scene.add(rig);

    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x15161a);
    const softbox = (w, h, x, y, z, strength) => {
        const mesh = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(strength, strength, strength),
                side: THREE.DoubleSide,
            }),
        );
        mesh.position.set(x, y, z);
        mesh.lookAt(0, 0, 0);
        studio.add(mesh);
    };
    softbox(30, 14, 0, 22, 4, 3);
    softbox(14, 20, -24, 4, 10, 1.7);
    softbox(14, 20, 24, 2, 8, 1.3);
    softbox(26, 10, 0, 4, 28, 1);
    softbox(40, 40, 0, -20, 0, 0.2);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(studio, 0.03).texture;
    pmrem.dispose();

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    keyLight.position.set(6, 9, 10);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xbfe9ff, 0.35);
    rimLight.position.set(-8, 4, -6);
    scene.add(rimLight);

    const std = (color, roughness = 0.4, metalness = 0.7) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const glow = (color) => new THREE.MeshBasicMaterial({ color });
    const place = (mesh, x = 0, y = 0, z = 0) => {
        mesh.position.set(x, y, z);
        return mesh;
    };
    const box = (w, h, d, material, x, y, z) =>
        place(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z);
    const roundedShape = (w, h, r) => {
        const shape = new THREE.Shape();
        const x = -w / 2;
        const y = -h / 2;
        shape.moveTo(x + r, y);
        shape.lineTo(x + w - r, y);
        shape.quadraticCurveTo(x + w, y, x + w, y + r);
        shape.lineTo(x + w, y + h - r);
        shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        shape.lineTo(x + r, y + h);
        shape.quadraticCurveTo(x, y + h, x, y + h - r);
        shape.lineTo(x, y + r);
        shape.quadraticCurveTo(x, y, x + r, y);
        return shape;
    };
    const slab = (w, h, d, r, material, x, y, z) => {
        const bevel = Math.min(0.03, d / 4);
        const geometry = new THREE.ExtrudeGeometry(roundedShape(w - bevel * 2, h - bevel * 2, r), {
            depth: d - bevel * 2,
            bevelEnabled: true,
            bevelSize: bevel,
            bevelThickness: bevel,
            bevelSegments: 3,
            curveSegments: 8,
        });
        geometry.center();
        return place(new THREE.Mesh(geometry, material), x, y, z);
    };
    const cylinder = (radius, length, material, x, y, z) => {
        const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(radius, radius, length, 28),
            material,
        );
        mesh.rotation.x = Math.PI / 2;
        return place(mesh, x, y, z);
    };
    const canvasTexture = (textureWidth, textureHeight, draw) => {
        const element = document.createElement('canvas');
        element.width = textureWidth;
        element.height = textureHeight;
        draw(element.getContext('2d'), textureWidth, textureHeight);
        const texture = new THREE.CanvasTexture(element);
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = 4;
        return texture;
    };

    const graphite = std(0x1b1c21, 0.38, 0.85);
    const darkMetal = std(0x101115, 0.5, 0.8);
    const steel = std(0xc9ced8, 0.25, 1);
    const alu = std(0x8f96a3, 0.3, 1);
    const copper = std(0xb87a4a, 0.3, 1);
    const plastic = std(0x0c0d10, 0.6, 0.2);
    const white = std(0x9da0a6, 0.5, 0.25);

    const glowTexture = canvasTexture(128, 128, (ctx, w, h) => {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.28)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    });
    const halo = (color, size, opacity = 0.5) => {
        const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
                map: glowTexture,
                color,
                transparent: true,
                opacity,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            }),
        );
        sprite.scale.setScalar(size);
        return sprite;
    };

    const rotors = [];
    const makeFan = (size, ringColor) => {
        const fan = new THREE.Group();
        const radius = size * 0.46;
        const frameShape = roundedShape(size, size, size * 0.12);
        const hole = new THREE.Path();
        hole.absarc(0, 0, radius, 0, Math.PI * 2, true);
        frameShape.holes.push(hole);
        const frameGeometry = new THREE.ExtrudeGeometry(frameShape, {
            depth: 0.22,
            bevelEnabled: true,
            bevelSize: 0.015,
            bevelThickness: 0.015,
            bevelSegments: 2,
            curveSegments: 32,
        });
        frameGeometry.center();
        fan.add(new THREE.Mesh(frameGeometry, white));
        fan.add(halo(ringColor, size * 1.9, 0.3));
        fan.add(
            new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.022, 10, 64), glow(ringColor)),
        );

        const rotor = new THREE.Group();
        const bladeMaterial = new THREE.MeshStandardMaterial({
            color: 0x2b2f3a,
            roughness: 0.3,
            metalness: 0.4,
            transparent: true,
            opacity: 0.92,
        });
        const bladeShape = new THREE.Shape();
        bladeShape.moveTo(radius * 0.2, -radius * 0.08);
        bladeShape.quadraticCurveTo(radius * 0.7, -radius * 0.42, radius * 0.93, -radius * 0.1);
        bladeShape.quadraticCurveTo(radius * 0.86, radius * 0.3, radius * 0.24, radius * 0.16);
        bladeShape.lineTo(radius * 0.2, -radius * 0.08);
        const bladeGeometry = new THREE.ExtrudeGeometry(bladeShape, {
            depth: 0.012,
            bevelEnabled: false,
        });
        const bladeCount = weak ? 6 : 8;
        for (let i = 0; i < bladeCount; i++) {
            const pivot = new THREE.Group();
            pivot.rotation.z = (i / bladeCount) * Math.PI * 2;
            const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
            blade.rotation.x = 0.42;
            pivot.add(blade);
            rotor.add(pivot);
        }
        rotor.add(cylinder(radius * 0.24, 0.14, darkMetal));
        rotor.add(cylinder(radius * 0.13, 0.15, glow(ringColor)));
        fan.add(rotor);
        rotors.push(rotor);
        return fan;
    };

    const parts = {};
    const addPart = (name, group, offset) => {
        rig.add(group);
        parts[name] = {
            group,
            home: group.position.clone(),
            offset: new THREE.Vector3(...offset),
        };
    };

    const meshTexture = canvasTexture(256, 512, (ctx, w, h) => {
        ctx.fillStyle = '#a7a9ae';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#6f7177';
        for (let y = 6; y < h; y += 12) {
            for (let x = (y / 12) % 2 ? 6 : 12; x < w; x += 12) {
                ctx.beginPath();
                ctx.arc(x, y, 3.2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    });

    const chassis = new THREE.Group();
    chassis.add(slab(4.4, 4.8, 0.1, 0.14, white, 0, 0, -1.05));
    chassis.add(box(4.4, 0.1, 2.15, white, 0, 2.35, 0));
    chassis.add(box(4.4, 0.1, 2.15, white, 0, -2.35, 0));
    chassis.add(box(0.1, 4.8, 2.15, white, -2.15, 0, 0));
    const front = slab(
        2.15,
        4.8,
        0.12,
        0.1,
        new THREE.MeshStandardMaterial({ map: meshTexture, roughness: 0.5, metalness: 0.1 }),
    );
    front.rotation.y = Math.PI / 2;
    front.position.x = 2.16;
    chassis.add(front);
    chassis.add(box(4.2, 0.06, 2.0, white, 0, -1.15, 0));
    [-1.7, 1.7].forEach((x) => {
        [-0.75, 0.75].forEach((z) => chassis.add(slab(0.6, 0.16, 0.35, 0.05, white, x, -2.48, z)));
    });
    for (let i = 0; i < 7; i++) {
        chassis.add(box(0.04, 0.16, 1.2, darkMetal, -2.2, -0.2 - i * 0.24, 0.1));
    }
    addPart('chassis', chassis, [0, 0, -6.4]);

    const boardTexture = canvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#0b0c10';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(120, 140, 170, 0.22)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 46; i++) {
            const x = 20 + ((i * 53) % (w - 40));
            const y = 20 + ((i * 97) % (h - 40));
            const length = 30 + ((i * 31) % 90);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + length, y);
            ctx.lineTo(x + length + 16, y + 16);
            ctx.lineTo(x + length + 16, y + 16 + (i % 3) * 20);
            ctx.stroke();
        }
        ctx.fillStyle = 'rgba(190, 200, 215, 0.5)';
        for (let i = 0; i < 90; i++) {
            ctx.fillRect(10 + ((i * 71) % (w - 20)), 10 + ((i * 113) % (h - 20)), 4, 4);
        }
    });
    const board = new THREE.Group();
    board.add(
        box(
            3.1,
            3.3,
            0.06,
            new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.55, metalness: 0.3 }),
        ),
    );
    board.add(slab(1.75, 0.34, 0.26, 0.05, alu, -0.3, 1.4, 0.16));
    board.add(slab(0.5, 1.5, 0.5, 0.06, graphite, -1.3, 0.6, 0.3));
    board.add(slab(0.7, 0.7, 0.16, 0.08, alu, 0.98, -0.88, 0.11));
    board.add(box(0.86, 0.86, 0.05, steel, -0.15, 0.75, 0.05));
    board.add(box(0.7, 0.7, 0.06, plastic, -0.15, 0.75, 0.06));
    [-0.62, -1.14].forEach((y) => {
        board.add(box(2.35, 0.1, 0.14, plastic, -0.25, y, 0.1));
        board.add(box(2.39, 0.13, 0.05, steel, -0.25, y, 0.055));
    });
    board.add(box(1.15, 0.26, 0.05, alu, -0.4, -0.2, 0.06));
    for (let i = 0; i < 4; i++) board.add(box(0.07, 1.45, 0.12, plastic, 0.82 + i * 0.17, 0.75, 0.09));
    board.add(box(0.2, 0.9, 0.2, plastic, 1.42, 0.6, 0.13));
    for (let i = 0; i < 9; i++) {
        board.add(cylinder(0.05, 0.16, darkMetal, -0.95 + i * 0.16, 1.12, 0.1));
    }
    board.position.set(-0.5, 0.6, -0.97);
    addPart('mobo', board, [0, 0, -1.4]);

    const cpu = new THREE.Group();
    cpu.add(box(0.72, 0.72, 0.03, std(0x1c5c3a, 0.6, 0.2)));
    cpu.add(slab(0.58, 0.58, 0.08, 0.05, steel, 0, 0, 0.05));
    cpu.position.set(-0.65, 1.35, -0.86);
    addPart('cpu', cpu, [0, 0, 0.3]);

    const cooler = new THREE.Group();
    const finCount = weak ? 8 : 14;
    for (let i = 0; i < finCount; i++) {
        cooler.add(box(1.0, 0.018, 0.5, alu, 0, -0.48 + (i * 0.966) / (finCount - 1), 0));
    }
    cooler.add(slab(1.04, 0.06, 0.54, 0.02, white, 0, 0.52, 0));
    [-0.3, -0.1, 0.1, 0.3].forEach((x) => {
        const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.25, 12), copper);
        pipe.position.set(x, -0.08, 0);
        cooler.add(pipe);
    });
    cooler.add(box(0.6, 0.12, 0.5, copper, 0, -0.62, 0));
    const coolerFan = makeFan(1.0, CYAN);
    coolerFan.position.z = 0.38;
    cooler.add(coolerFan);
    cooler.position.set(-0.65, 1.42, -0.4);
    addPart('cooler', cooler, [0, 0, 3.0]);

    const ramTexture = canvasTexture(16, 128, (ctx, w, h) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#19d8f5');
        gradient.addColorStop(0.5, '#a57bff');
        gradient.addColorStop(1, '#ff4fa3');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    });
    const ram = new THREE.Group();
    for (let i = 0; i < 4; i++) {
        ram.add(slab(0.09, 1.3, 0.5, 0.02, white, i * 0.17, 0, 0));
        ram.add(
            place(
                new THREE.Mesh(
                    new THREE.BoxGeometry(0.07, 0.12, 0.5),
                    new THREE.MeshBasicMaterial({ map: ramTexture }),
                ),
                i * 0.17,
                0.7,
                0,
            ),
        );
    }
    ram.add(place(halo(0xa57bff, 1.6, 0.45), 0.25, 0.75, 0));
    ram.position.set(0.32, 1.35, -0.62);
    addPart('ram', ram, [0, 0, 1.6]);

    const gpu = new THREE.Group();
    gpu.add(slab(3.05, 0.5, 1.4, 0.05, white));
    gpu.add(slab(3.05, 0.05, 1.44, 0.02, alu, 0, 0.29, 0));
    if (!weak) {
        for (let i = 0; i < 20; i++) gpu.add(box(0.012, 0.3, 1.3, alu, -1.35 + i * 0.14, -0.08, 0));
    }
    gpu.add(slab(3.05, 0.12, 1.44, 0.04, white, 0, -0.3, 0));
    gpu.add(box(0.06, 1.0, 1.44, steel, -1.56, -0.05, 0));
    gpu.add(box(1.6, 0.14, 0.03, std(0xd9a441, 0.3, 1), -0.5, -0.1, -0.74));
    gpu.add(box(2.7, 0.05, 0.02, glow(CYAN), 0.05, 0.16, 0.725));
    [-1, 0, 1].forEach((x) => {
        const fan = makeFan(0.92, x === 0 ? PINK : CYAN);
        fan.rotation.x = Math.PI / 2;
        fan.position.set(x, -0.33, 0);
        gpu.add(fan);
    });
    const tag = new THREE.Mesh(
        new THREE.PlaneGeometry(0.9, 0.225),
        new THREE.MeshBasicMaterial({
            map: canvasTexture(256, 64, (ctx) => {
                ctx.fillStyle = '#16171b';
                ctx.font = '800 44px Arial, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('RTX', 128, 34);
            }),
            transparent: true,
        }),
    );
    tag.position.set(-0.9, -0.06, 0.726);
    gpu.add(tag);
    gpu.position.set(-0.45, -0.3, -0.2);
    addPart('gpu', gpu, [0, 0, 4.8]);

    const ssd = new THREE.Group();
    ssd.add(box(1.0, 0.24, 0.04, std(0x0d1422, 0.5, 0.4)));
    ssd.add(box(0.26, 0.16, 0.03, plastic, -0.25, 0, 0.03));
    ssd.add(box(0.26, 0.16, 0.03, plastic, 0.08, 0, 0.03));
    ssd.add(box(0.2, 0.14, 0.012, steel, 0.36, 0, 0.03));
    ssd.position.set(-0.9, 0.4, -0.9);
    addPart('ssd', ssd, [0, -0.9, 1.0]);

    const psu = new THREE.Group();
    psu.add(slab(1.8, 1.0, 1.85, 0.06, white));
    for (let i = 0; i < 6; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1 + i * 0.07, 0.012, 6, 40), steel);
        ring.position.set(0.3, 0, 0.93);
        psu.add(ring);
    }
    psu.add(box(0.6, 0.3, 0.02, darkMetal, -0.5, 0.2, 0.93));
    psu.add(box(0.45, 0.05, 0.022, glow(PINK), -0.5, 0.2, 0.935));
    psu.position.set(-1.15, -1.78, 0);
    addPart('psu', psu, [0, -1.4, 3.6]);

    const fans = new THREE.Group();
    [1.48, 0, -1.48].forEach((y, i) => {
        const fan = makeFan(1.4, i === 1 ? PINK : CYAN);
        fan.rotation.y = Math.PI / 2;
        fan.position.y = y;
        fans.add(fan);
    });
    fans.position.set(1.9, 0, 0);
    addPart('fans', fans, [0.4, 0, -3.9]);

    const rear = makeFan(1.25, PINK);
    rear.rotation.y = -Math.PI / 2;
    rear.position.set(-1.95, 1.42, 0);
    addPart('rear', rear, [0, 0.2, -3.9]);

    const glass = new THREE.Group();
    glass.add(
        slab(
            4.4,
            4.8,
            0.05,
            0.14,
            new THREE.MeshStandardMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.1,
                roughness: 0.02,
                metalness: 0.9,
                envMapIntensity: 1.6,
                depthWrite: false,
            }),
        ),
    );
    [
        [0, 2.34, 4.4, 0.1],
        [0, -2.34, 4.4, 0.1],
        [-2.14, 0, 0.1, 4.8],
        [2.14, 0, 0.1, 4.8],
    ].forEach(([x, y, w, h]) => glass.add(box(w, h, 0.06, white, x, y, 0)));
    glass.position.z = 1.08;
    addPart('glass', glass, [0, 0, 7.0]);

    const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(9, 5),
        new THREE.MeshBasicMaterial({
            map: canvasTexture(256, 256, (ctx, w, h) => {
                const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, h);
            }),
            transparent: true,
            depthWrite: false,
        }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -2.62;
    rig.add(shadow);

    const anchors = {
        glass: [[0, -2.4, 0], 1, 40],
        gpu: [[0, -0.45, 0], 1, 40],
        cooler: [[0, 0.75, 0], -1, 34],
        ram: [[0.25, 0.8, 0], -1, 34],
        cpu: [[0, -0.4, 0], 1, 150],
        mobo: [[0.4, -1.7, 0], 1, 40],
        psu: [[0, -0.55, 0], 1, 36],
        fans: [[0, -2.25, 0], 1, 40],
        chassis: [[1.2, -2.5, 0], 1, 40],
    };
    const labels = labelEls
        .filter((el) => parts[el.dataset.part])
        .map((el) => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            linesSvg.appendChild(line);
            return {
                el,
                line,
                part: parts[el.dataset.part],
                anchor: new THREE.Vector3(...anchors[el.dataset.part][0]),
                side: anchors[el.dataset.part][1],
                drop: anchors[el.dataset.part][2],
            };
        });

    const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (t) => t * t * (3 - 2 * t);
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const halfTan = Math.tan((FOV * Math.PI) / 360);
    const pointer = { x: 0, y: 0 };
    const projected = new THREE.Vector3();
    const cameraDrift = { z: 0 };
    let width = 1;
    let height = 1;
    let visible = false;
    let frame = 0;
    let lastTime = 0;
    let activeStep = -2;
    let eased = -1;
    let lastGap = 0;
    let frameAvg = 17;
    let frameCount = 0;
    let quality = 1;
    const styleCache = {};

    // Limita de pixeli: pe ecranele dense/slabe desenam mai putini pixeli, dar la fiecare cadru.
    const PIXEL_BUDGET = lite ? 0.9e6 : 2.2e6;
    const resize = () => {
        width = sticky.clientWidth;
        height = sticky.clientHeight;
        const fit = Math.sqrt(PIXEL_BUDGET / Math.max(width * height, 1));
        renderer.setPixelRatio(Math.max(Math.min(basePixelRatio, fit) * quality, 0.5));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        linesSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        labels.forEach((label) => {
            label.w = label.el.offsetWidth;
            label.h = label.el.offsetHeight;
        });
    };
    const setStyle = (key, value, apply) => {
        if (styleCache[key] === value) return;
        styleCache[key] = value;
        apply(value);
    };

    const render = (time) => {
        if (visible) frame = requestAnimationFrame(render);
        if (document.documentElement.classList.contains('entry-lock')) return;
        const gap = time - lastGap;
        lastGap = time;
        if (gap > 0 && gap < 250) frameAvg += (gap - frameAvg) * 0.1;
        // Tinta e 60 fps la fiecare cadru: daca nu ajungem, scadem rezolutia, nu sarim cadre.
        if (++frameCount > 40 && frameCount % 30 === 0 && frameAvg > 18 && quality > 0.5) {
            quality = Math.max(0.5, quality * 0.85);
            resize();
            frameAvg = 16;
        }
        const delta = Math.min((time - lastTime) / 1000, 0.07);
        lastTime = time;

        const rect = section.getBoundingClientRect();
        // Desfacerea PC-ului urmeaza derularea si cu animatiile reduse: o controleaza utilizatorul.
        const goal = clamp01(-rect.top / (rect.height - window.innerHeight));
        eased = eased < 0 ? goal : eased + (goal - eased) * Math.min(1, delta * 5);
        const progress = eased;
        const rise = smooth(clamp01(progress / 0.16));
        const turn = smooth(clamp01(progress / 0.36));
        const explode = easeInOut(clamp01((progress - 0.36) / 0.36));
        const labelAlpha = clamp01((progress - 0.74) / 0.08);
        const wide = camera.aspect > 1.15;

        const needHeight = lerp(8.6, wide ? 9.6 : 12, explode);
        const needWidth = lerp(7.4, wide ? 19 : 13.5, explode);
        const distance = Math.max(
            needHeight / (2 * halfTan),
            needWidth / (2 * halfTan * camera.aspect),
        );
        camera.position.set(0, 1.1, distance);
        camera.lookAt(0, 0, 0);

        const sway = motionOff ? 0 : Math.sin(time * 0.0004) * 0.04;
        const target = wide ? -1.08 : -1.0;
        rig.rotation.y = lerp(lerp(1.3, -0.62, turn), target, explode) + sway + pointer.x * 0.06;
        rig.rotation.x = 0.06 + pointer.y * 0.03;
        rig.position.y = lerp(-5.4, wide ? 0.2 : -0.4, rise) + (wide ? 0.5 : 0.2) * explode;
        shadow.material.opacity = 1 - explode;
        cameraDrift.z = lerp(0, -0.035, explode);
        camera.rotation.z = cameraDrift.z;
        setStyle('bars', explode.toFixed(2), (v) => sticky.style.setProperty('--bars', v));

        Object.values(parts).forEach((part) => {
            part.group.position
                .copy(part.home)
                .addScaledVector(part.offset, explode * (wide ? 1 : 0.66));
        });
        if (!motionOff) rotors.forEach((rotor) => (rotor.rotation.z -= delta * 6));

        renderer.render(scene, camera);

        const titleFade = clamp01(progress / 0.14);
        setStyle('title', titleFade.toFixed(3), () => {
            title.style.opacity = 1 - titleFade;
            title.style.transform = `translate3d(0, ${-titleFade * 120}px, 0) scale(${1 - titleFade * 0.08})`;
        });

        setStyle('labels', labelAlpha.toFixed(2), (v) => {
            linesSvg.style.opacity = v;
            labels.forEach(({ el }) => (el.style.opacity = v));
        });
        if (labelAlpha > 0) {
            const placed = [];
            labels.forEach((label) => {
                const { line, part, anchor, side, drop, w, h } = label;
                if (!w) {
                    line.style.display = 'none';
                    return;
                }
                line.style.display = '';
                projected.copy(anchor);
                part.group.localToWorld(projected);
                projected.project(camera);
                const x = (projected.x * 0.5 + 0.5) * width;
                const y = (-projected.y * 0.5 + 0.5) * height;
                const half = w / 2 + 10;
                const gap = wide ? drop : Math.min(drop, 30);
                label.x = x;
                label.y = y;
                label.labelX = Math.min(Math.max(x, half), width - half);
                label.labelY =
                    side > 0
                        ? Math.min(y + gap, height - h - 60)
                        : Math.max(y - gap - h, 70);
                placed.push(label);
            });
            if (!wide) {
                // Pe ecrane inguste etichetele se suprapun: le impingem pe verticala.
                placed.sort((a, b) => a.labelY - b.labelY);
                placed.forEach((label, i) => {
                    for (let j = 0; j < i; j++) {
                        const other = placed[j];
                        const overlapX = Math.abs(label.labelX - other.labelX) < (label.w + other.w) / 2 + 6;
                        if (overlapX && label.labelY < other.labelY + other.h + 6) {
                            label.labelY = other.labelY + other.h + 6;
                        }
                    }
                });
            }
            placed.forEach(({ el, line, x, y, labelX, labelY, h }) => {
                const above = labelY + h < y;
                el.style.transform = `translate(${labelX}px, ${labelY}px) translate(-50%, 0)`;
                line.setAttribute('x1', x);
                line.setAttribute('y1', y + (above ? -4 : 4));
                line.setAttribute('x2', labelX);
                line.setAttribute('y2', above ? labelY + h + 4 : labelY - 4);
            });
        }

        const step = progress < 0.14 ? -1 : progress < 0.36 ? 0 : progress < 0.74 ? 1 : 2;
        if (step !== activeStep) {
            activeStep = step;
            steps.forEach((el, index) => el.classList.toggle('active', index === step));
        }
        setStyle('bar', (progress * 100).toFixed(1), (v) => (bar.style.width = `${v}%`));
    };

    resize();
    // Pregatim shaderele si texturile cat timp ruleaza intrarea, ca trecerea spre site sa fie fluida.
    renderer.compile(scene, camera);
    scene.traverse((object) => {
        const material = object.material;
        if (material && material.map && material.map.image) renderer.initTexture(material.map);
    });
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
        pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
    });
    new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        cancelAnimationFrame(frame);
        if (visible) frame = requestAnimationFrame(render);
    }).observe(section);
})();

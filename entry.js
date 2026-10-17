(() => {
    const entry = document.getElementById('entry');
    if (!entry) return;

    const canvas = document.getElementById('entryCanvas');
    const enterButton = document.getElementById('entryEnter');
    const skipButton = document.getElementById('entrySkip');
    const lite = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
    const weak = lite || (navigator.hardwareConcurrency || 8) <= 4;

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const navigation = performance.getEntriesByType('navigation')[0];
    const reloaded = Boolean(navigation && navigation.type === 'reload');
    const settle = () => {
        const target =
            !reloaded && location.hash.length > 1
                ? document.getElementById(location.hash.slice(1))
                : null;
        if (target) {
            target.scrollIntoView({ behavior: 'instant' });
            return;
        }
        if (location.hash) {
            try {
                history.replaceState(null, '', location.pathname + location.search);
            } catch (error) {
                /* file:// */
            }
        }
        window.scrollTo({ top: 0, behavior: 'instant' });
    };

    const close = () => {
        entry.remove();
        document.documentElement.classList.remove('entry-lock');
        if (reloaded) settle();
    };
    // Intrarea porneste doar la apasarea pe "Intra", asa ca o aratam si cu animatiile reduse.
    if (!window.THREE) {
        close();
        return;
    }

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: !weak,
            powerPreference: 'high-performance',
        });
    } catch (error) {
        close();
        return;
    }
    document.documentElement.classList.add('entry-lock');
    window.scrollTo({ top: 0, behavior: 'instant' });
    const basePixelRatio = Math.min(window.devicePixelRatio || 1, lite ? 1.25 : 1.5);
    renderer.setPixelRatio(basePixelRatio);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.8;

    const CYAN = 0x2ff3e0;
    const PINK = 0xff3fa4;
    const PURPLE = 0x9b4dff;
    const ORANGE = 0xff7a1a;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03010a);
    scene.fog = new THREE.Fog(0x080216, 30, 120);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);

    const studio = new THREE.Scene();
    studio.background = new THREE.Color(0x0c0518);
    [
        [40, 16, 0, 26, 6, [0.4, 0.12, 0.5]],
        [16, 20, -30, 6, 12, [0.15, 0.5, 0.55]],
        [16, 20, 30, 4, 10, [0.6, 0.15, 0.4]],
        [40, 10, 0, 6, -30, [0.3, 0.1, 0.4]],
    ].forEach(([w, h, x, y, z, rgb]) => {
        const panel = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(...rgb), side: THREE.DoubleSide }),
        );
        panel.position.set(x, y, z);
        panel.lookAt(0, 0, 0);
        studio.add(panel);
    });
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(studio, 0.04).texture;
    pmrem.dispose();

    const std = (color, roughness = 0.5, metalness = 0.4) =>
        new THREE.MeshStandardMaterial({ color, roughness, metalness });
    const glowCache = new Map();
    const glow = (color) => {
        if (!glowCache.has(color)) glowCache.set(color, new THREE.MeshBasicMaterial({ color }));
        return glowCache.get(color);
    };
    const add = (mesh, x = 0, y = 0, z = 0) => {
        mesh.position.set(x, y, z);
        scene.add(mesh);
        return mesh;
    };
    const box = (w, h, d, material, x, y, z) =>
        add(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z);
    const canvasTexture = (width, height, draw) => {
        const element = document.createElement('canvas');
        element.width = width;
        element.height = height;
        draw(element.getContext('2d'), width, height);
        const texture = new THREE.CanvasTexture(element);
        texture.encoding = THREE.sRGBEncoding;
        texture.anisotropy = 8;
        return texture;
    };
    const glowTexture = canvasTexture(128, 128, (ctx, w, h) => {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);
    });
    const halo = (color, size, opacity, x, y, z) => {
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
        return add(sprite, x, y, z);
    };
    const neon = (w, h, d, color, x, y, z) => box(w, h, d, glow(color), x, y, z);

    const sky = new THREE.Mesh(
        new THREE.PlaneGeometry(360, 180),
        new THREE.MeshBasicMaterial({
            fog: false,
            map: canvasTexture(2048, 1024, (ctx, w, h) => {
                const horizon = h * 0.75;
                const gradient = ctx.createLinearGradient(0, 0, 0, horizon);
                gradient.addColorStop(0, '#03010a');
                gradient.addColorStop(0.55, '#06021a');
                gradient.addColorStop(0.86, '#160630');
                gradient.addColorStop(1, '#4a1050');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, horizon);

                const sunY = horizon - 118;
                const sunR = 150;
                const sun = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
                sun.addColorStop(0, '#b0603e');
                sun.addColorStop(0.5, '#a02468');
                sun.addColorStop(1, '#4a1070');
                ctx.save();
                ctx.beginPath();
                ctx.arc(w / 2, sunY, sunR, 0, Math.PI * 2);
                ctx.clip();
                ctx.fillStyle = sun;
                ctx.fillRect(0, 0, w, h);
                ctx.globalCompositeOperation = 'destination-out';
                for (let i = 0; i < 7; i++) {
                    ctx.fillRect(0, sunY + 10 + i * 20, w, 4 + i * 2);
                }
                ctx.restore();
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, w, horizon);
                ctx.globalCompositeOperation = 'source-over';
                ctx.fillStyle = '#ffffff';
                for (let i = 0; i < 260; i++) {
                    const sx = (i * 197) % w;
                    const sy = (i * 89) % (horizon - 260);
                    if (Math.hypot(sx - w / 2, sy - sunY) < sunR + 12) continue;
                    ctx.globalAlpha = 0.25 + ((i * 7) % 10) / 14;
                    ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
                }
                ctx.globalAlpha = 1;

                for (let i = 0; i < 70; i++) {
                    const bw = 14 + ((i * 37) % 30);
                    const bh = 16 + ((i * 53) % 62);
                    const bx = (i * 131) % w;
                    if (Math.abs(bx - w / 2) < 190) continue;
                    ctx.fillStyle = '#07030f';
                    ctx.fillRect(bx, horizon - bh, bw, bh);
                    ctx.fillStyle = i % 2 ? '#ff6fc0' : '#62f5ea';
                    for (let k = 0; k < 5; k++) {
                        ctx.fillRect(bx + 3 + ((k * 7) % (bw - 6)), horizon - bh + 5 + ((k * 11) % (bh - 8)), 2, 2);
                    }
                }
                ctx.fillStyle = '#0d0420';
                ctx.fillRect(0, horizon, w, h - horizon);
            }),
        }),
    );
    add(sky, 0, 45, -75);

    const gridTexture = canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#04010a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#ff3fa4';
        ctx.lineWidth = 3;
        ctx.strokeRect(0, 0, w, h);
    });
    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
    gridTexture.repeat.set(52, 52);
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(260, 260),
        new THREE.MeshStandardMaterial({
            map: gridTexture,
            emissive: 0xffffff,
            emissiveMap: gridTexture,
            emissiveIntensity: 0.3,
            roughness: 0.3,
            metalness: 0.6,
        }),
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);

    const wall = std(0x160a26, 0.8, 0.1);
    const dark = std(0x0b0712, 0.5, 0.5);
    const deskWood = std(0x1c0f1c, 0.6, 0.2);
    const fascia = std(0x150a22, 0.5, 0.2);
    const caseWhite = std(0xe6e2ee, 0.45, 0.1);
    const glassMaterial = new THREE.MeshStandardMaterial({
        color: 0xffc8f0,
        transparent: true,
        opacity: 0.1,
        roughness: 0.03,
        metalness: 0.9,
        envMapIntensity: 1.6,
        depthWrite: false,
    });

    box(18, 0.1, 12, std(0x150b22, 0.85, 0.1), 0, 0.05, -6);
    box(18, 6, 0.3, wall, 0, 3, -12);
    box(0.3, 6, 12, wall, -9, 3, -6);
    box(0.3, 6, 12, wall, 9, 3, -6);
    box(20.6, 0.5, 14.4, dark, 0, 6.25, -5.6);
    box(18.3, 1.4, 0.3, fascia, 0, 5.3, 0);
    box(0.5, 6, 0.5, fascia, -9.1, 3, 0.05);
    box(0.5, 6, 0.5, fascia, 9.1, 3, 0.05);
    [5.62, 5.3, 4.98].forEach((y, i) => {
        neon(5.2 - i * 0.8, 0.07, 0.04, CYAN, -5.6 - i * 0.4, y, 0.17);
        neon(5.2 - i * 0.8, 0.07, 0.04, CYAN, 5.6 + i * 0.4, y, 0.17);
    });
    neon(20.7, 0.1, 0.1, PINK, 0, 6.52, 1.62);
    neon(20.7, 0.08, 0.08, CYAN, 0, 6.0, 1.62);
    neon(18.3, 0.07, 0.07, PINK, 0, 4.58, 0.18);
    neon(0.08, 6, 0.08, PINK, -9.38, 3, 0.32);
    neon(0.08, 6, 0.08, PINK, 9.38, 3, 0.32);
    neon(0.07, 4.5, 0.07, CYAN, -1.72, 2.3, 0.14);
    neon(0.07, 4.5, 0.07, CYAN, 1.72, 2.3, 0.14);
    [-9, -6.55, -4.1, 4.1, 6.55, 9].forEach((x) => box(0.1, 4.6, 0.14, dark, x, 2.3, 0));
    [-5.325, 5.325].forEach((x) => {
        add(new THREE.Mesh(new THREE.PlaneGeometry(7.35, 4.6), glassMaterial), x, 2.3, 0);
    });
    const doors = [-0.825, 0.825].map((x) => {
        const door = new THREE.Group();
        door.add(new THREE.Mesh(new THREE.PlaneGeometry(1.65, 4.6), glassMaterial));
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.2, 0.06), glow(CYAN));
        handle.position.set(-Math.sign(x) * 0.6, 0, 0.04);
        door.add(handle);
        return add(door, x, 2.3, 0.02);
    });

    const ceilingTexture = canvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#1a0d2c';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#07030f';
        ctx.lineWidth = 6;
        ctx.strokeRect(0, 0, w, h);
    });
    ceilingTexture.wrapS = ceilingTexture.wrapT = THREE.RepeatWrapping;
    ceilingTexture.repeat.set(12, 8);
    const ceiling = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 12),
        new THREE.MeshStandardMaterial({ map: ceilingTexture, roughness: 0.9, metalness: 0 }),
    );
    ceiling.rotation.x = Math.PI / 2;
    add(ceiling, 0, 4.5, -6);
    [
        [-3, -2.5],
        [3, -5.5],
        [-3, -8.5],
    ].forEach(([x, z]) => neon(1.4, 0.03, 0.9, 0xff9ae6, x, 4.47, z));

    scene.add(new THREE.HemisphereLight(0x7a45ff, 0x1a0520, 0.12));
    [
        [0xff3fd0, 0.5, 0, 3.8, -3],
        [PURPLE, 0.45, 0, 3.8, -8.5],
        [CYAN, 0.4, -6, 2.5, -6],
        [PINK, 0.4, 6, 2.5, -6],
    ]
        .slice(0, weak ? 2 : 4)
        .forEach(([color, intensity, x, y, z]) => {
        const light = new THREE.PointLight(color, intensity, 20);
        light.position.set(x, y, z);
        scene.add(light);
    });
    const sunLight = new THREE.DirectionalLight(0xc98aff, 0.18);
    sunLight.position.set(-8, 14, 16);
    scene.add(sunLight);

    const gameScreens = [
        ['#ff9a3c', '#7a2a12', '#ffd27a'],
        ['#3cc8ff', '#122a5c', '#b8f3ff'],
        ['#7dff8a', '#0f3a2a', '#f0ff9a'],
    ].map(([top, bottom, accent]) =>
        canvasTexture(256, 144, (ctx, w, h) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, top);
            gradient.addColorStop(1, bottom);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
            ctx.beginPath();
            ctx.moveTo(0, h);
            ctx.lineTo(60, 70);
            ctx.lineTo(120, 100);
            ctx.lineTo(180, 60);
            ctx.lineTo(w, 96);
            ctx.lineTo(w, h);
            ctx.fill();
            ctx.fillStyle = accent;
            ctx.fillRect(10, h - 16, 70, 5);
            ctx.fillRect(w - 46, 10, 36, 36);
            ctx.fillRect(w / 2 - 2, h / 2 - 8, 4, 16);
            ctx.fillRect(w / 2 - 8, h / 2 - 2, 16, 4);
        }),
    );
    const rainbow = new THREE.MeshBasicMaterial({
        map: canvasTexture(128, 32, (ctx, w, h) => {
            const gradient = ctx.createLinearGradient(0, 0, w, 0);
            ['#ff3fa4', '#ffb03c', '#f6ff5c', '#3cff9a', '#2ff3e0', '#6a6aff', '#c93cff'].forEach(
                (color, i, list) => gradient.addColorStop(i / (list.length - 1), color),
            );
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = 'rgba(8, 4, 16, 0.55)';
            for (let x = 0; x < w; x += 8) ctx.fillRect(x, 0, 2, h);
            for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 2);
        }),
    });
    const screenMaterials = gameScreens.map((map) => new THREE.MeshBasicMaterial({ map }));
    const chairMaterial = std(0x09070d, 0.55, 0.3);
    const ringGeometry = new THREE.TorusGeometry(0.2, 0.028, 8, 32);

    [-1, 1].forEach((side) => {
        box(1.3, 0.08, 10.6, deskWood, side * 7.95, 0.9, -6.1);
        box(0.06, 0.9, 10.6, deskWood, side * 7.32, 0.45, -6.1);
        box(0.8, 0.07, 10.6, deskWood, side * 8.45, 2.35, -6.1);
        neon(0.04, 0.04, 10.6, side > 0 ? PINK : CYAN, side * 8.06, 2.3, -6.1);

        for (let i = 0; i < 6; i += weak ? 2 : 1) {
            const z = -1.6 - i * 1.7;
            const accent = [CYAN, PINK, PURPLE][(i + (side > 0 ? 1 : 0)) % 3];

            box(0.05, 0.56, 0.98, dark, side * 8.2, 1.42, z);
            box(0.2, 0.2, 0.3, dark, side * 8.2, 1.04, z);
            const screen = new THREE.Mesh(
                new THREE.PlaneGeometry(0.92, 0.5),
                screenMaterials[(i + (side > 0 ? 2 : 0)) % 3],
            );
            screen.rotation.y = -side * (Math.PI / 2);
            add(screen, side * (8.2 - 0.03), 1.42, z);

            box(0.2, 0.03, 0.62, rainbow, side * 7.62, 0.955, z);
            box(0.5, 0.01, 0.4, dark, side * 7.62, 0.945, z + 0.62);
            neon(0.1, 0.03, 0.07, accent, side * 7.62, 0.96, z + 0.62);

            box(0.42, 0.9, 0.8, caseWhite, side * 8.45, 2.84, z);
            [0.2, -0.2].forEach((dy) => {
                const ring = new THREE.Mesh(ringGeometry, glow(dy > 0 ? accent : PINK));
                ring.rotation.y = Math.PI / 2;
                add(ring, side * (8.45 - 0.22), 2.84 + dy, z);
            });
            halo(accent, 1.5, 0.35, side * 8.1, 2.84, z);

            box(0.6, 0.12, 0.6, chairMaterial, side * 6.75, 0.58, z);
            box(0.12, 1.15, 0.56, chairMaterial, side * 6.42, 1.2, z);
            box(0.13, 0.3, 0.4, chairMaterial, side * 6.42, 1.9, z);
            neon(0.125, 0.5, 0.05, accent, side * 6.42, 1.3, z + 0.2);
            box(0.08, 0.5, 0.08, chairMaterial, side * 6.75, 0.28, z);
            box(0.6, 0.05, 0.6, chairMaterial, side * 6.75, 0.04, z);
            if (i % 2 === 0) halo(accent, 3.6, 0.16, side * 7.6, 1.4, z);
        }
    });

    neon(0.07, 3.6, 0.07, ORANGE, -8.6, 2.3, -11.7);
    halo(ORANGE, 5, 0.3, -8.5, 2.3, -11.5);
    neon(0.07, 3.6, 0.07, PINK, 8.6, 2.3, -11.7);
    halo(PINK, 5, 0.25, 8.5, 2.3, -11.5);

    const tapestry = (flip) =>
        canvasTexture(512, 384, (ctx, w, h) => {
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, '#1a0a3a');
            gradient.addColorStop(1, '#5a1260');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
            const sun = ctx.createLinearGradient(0, 70, 0, 280);
            sun.addColorStop(0, '#ffe65c');
            sun.addColorStop(1, '#ff2f9a');
            ctx.fillStyle = sun;
            ctx.beginPath();
            ctx.arc(flip ? 330 : 180, 180, 105, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a0f58';
            for (let i = 0; i < 6; i++) ctx.fillRect(0, 196 + i * 18, w, 3 + i * 1.5);
            ctx.strokeStyle = '#2ff3e0';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(flip ? 60 : 300, 90);
            ctx.lineTo(flip ? 220 : 460, 90);
            ctx.lineTo(flip ? 140 : 380, 250);
            ctx.closePath();
            ctx.stroke();
            ctx.strokeStyle = '#ff3fa4';
            ctx.lineWidth = 3;
            for (let i = 0; i < 9; i++) {
                ctx.beginPath();
                ctx.moveTo(w / 2, 300);
                ctx.lineTo((i / 8) * w, h);
                ctx.stroke();
            }
            ctx.strokeRect(8, 8, w - 16, h - 16);
        });
    [-1, 1].forEach((side) => {
        add(
            new THREE.Mesh(
                new THREE.PlaneGeometry(4, 3),
                new THREE.MeshBasicMaterial({ map: tapestry(side > 0), color: 0xb8a8c8 }),
            ),
            side * 4.6,
            2.55,
            -11.83,
        );
    });

    const logoTexture = new THREE.TextureLoader().load(window.PG_LOGO || '');
    logoTexture.encoding = THREE.sRGBEncoding;
    const logoMaterial = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true });
    const makeLogo = (size, x, y, z) =>
        add(new THREE.Mesh(new THREE.PlaneGeometry(size, size), logoMaterial), x, y, z);

    box(4.3, 4.3, 0.16, dark, 0, 8.85, 0.8);
    neon(4.5, 0.08, 0.08, PINK, 0, 11.02, 0.9);
    neon(4.5, 0.08, 0.08, PINK, 0, 6.68, 0.9);
    neon(0.08, 4.4, 0.08, CYAN, -2.2, 8.85, 0.9);
    neon(0.08, 4.4, 0.08, CYAN, 2.2, 8.85, 0.9);
    makeLogo(3.7, 0, 8.85, 0.9);
    halo(PINK, 13, 0.14, 0, 8.85, 1.3);

    box(3.8, 1.1, 0.9, dark, 0, 0.67, -8.9);
    neon(3.8, 0.05, 0.05, PINK, 0, 0.14, -8.43);
    neon(3.8, 0.05, 0.05, CYAN, 0, 1.2, -8.43);
    makeLogo(0.95, 0, 0.67, -8.44);
    box(3.9, 0.06, 1.0, deskWood, 0, 1.25, -8.9);
    box(0.5, 0.04, 0.3, dark, 0, 1.3, -8.9);
    box(0.08, 0.36, 0.06, dark, 0, 1.48, -8.95);
    box(1.72, 1.0, 0.05, dark, 0, 2.1, -8.93);
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 1280;
    screenCanvas.height = 720;
    const screenTexture = new THREE.CanvasTexture(screenCanvas);
    screenTexture.encoding = THREE.sRGBEncoding;
    const drawScreen = () => {
        const ctx = screenCanvas.getContext('2d');
        ctx.fillStyle = '#08080a';
        ctx.fillRect(0, 0, 1280, 720);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#8d8b85';
        ctx.font = '500 18px "JetBrains Mono", monospace';
        ctx.fillText('CLUB DE GAMING  ·  CIOCANA, CHIȘINĂU', 640, 170);
        ctx.fillStyle = '#f3f1ec';
        ctx.font = '800 104px "Unbounded", "Arial Black", Arial, sans-serif';
        ctx.fillText('PRO GAMING', 640, 290);
        ctx.fillText('HUB', 640, 390);
        screenTexture.needsUpdate = true;
    };
    drawScreen();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawScreen);
    add(
        new THREE.Mesh(
            new THREE.PlaneGeometry(1.64, 0.9225),
            new THREE.MeshBasicMaterial({ map: screenTexture }),
        ),
        0,
        2.1,
        -8.9,
    );

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 256;
    const signTexture = new THREE.CanvasTexture(signCanvas);
    signTexture.encoding = THREE.sRGBEncoding;
    const drawSign = () => {
        const ctx = signCanvas.getContext('2d');
        ctx.clearRect(0, 0, 1024, 256);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 150px "Unbounded", "Arial Black", Arial, sans-serif';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#ff3fa4';
        ctx.shadowBlur = 34;
        ctx.strokeStyle = '#ff3fa4';
        ctx.lineWidth = 14;
        ctx.strokeText('ENTER', 512, 134);
        ctx.strokeText('ENTER', 512, 134);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#fff3fb';
        ctx.fillText('ENTER', 512, 134);
        signTexture.needsUpdate = true;
    };
    drawSign();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawSign);
    const enterSign = add(
        new THREE.Mesh(
            new THREE.PlaneGeometry(5.6, 1.4),
            new THREE.MeshBasicMaterial({ map: signTexture, transparent: true, depthWrite: false }),
        ),
        0,
        0.78,
        18,
    );
    const signGlow = halo(PINK, 9, 0.22, 0, 0.6, 17.8);
    const arrows = [14.6, 12.4, 10.2].map((z) => {
        const arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.42, 0.7, 3),
            new THREE.MeshBasicMaterial({ color: CYAN, transparent: true }),
        );
        arrow.rotation.x = -Math.PI / 2;
        arrow.scale.y = 1;
        return add(arrow, 0, 0.12, z);
    });

    const trunkMaterial = std(0x1a0d22, 0.8, 0.1);
    const leafMaterial = new THREE.MeshStandardMaterial({
        color: 0x0f4a44,
        roughness: 0.6,
        metalness: 0.2,
        side: THREE.DoubleSide,
    });
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(1.6, 0.55, 3.6, 0);
    leafShape.quadraticCurveTo(1.6, -0.55, 0, 0);
    const leafGeometry = new THREE.ShapeGeometry(leafShape);
    [
        [-11.8, 4.5, 8.4, 0.07],
        [11.8, 5, 7.6, -0.06],
        [-15, -3, 10, 0.05],
        [15.4, -2, 9.4, -0.05],
        [-19, 9, 7, 0.04],
        [19.5, 10, 7.6, -0.04],
    ].forEach(([x, z, heightTotal, lean]) => {
        const palm = new THREE.Group();
        const segments = 10;
        for (let i = 0; i < segments; i++) {
            const piece = new THREE.Mesh(
                new THREE.CylinderGeometry(0.2 - i * 0.008, 0.24 - i * 0.008, heightTotal / segments + 0.05, 10),
                trunkMaterial,
            );
            const t = i / segments;
            piece.position.set(lean * heightTotal * t * t * 6, heightTotal * (t + 0.5 / segments), 0);
            piece.rotation.z = -lean * t * 3.2;
            palm.add(piece);
        }
        const crown = new THREE.Group();
        crown.position.set(lean * heightTotal * 6 * 0.84, heightTotal, 0);
        for (let i = 0; i < 12; i++) {
            const pivot = new THREE.Group();
            pivot.rotation.y = (i / 12) * Math.PI * 2;
            const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
            leaf.rotation.z = -0.3 - (i % 3) * 0.17;
            leaf.rotation.x = 0.5;
            pivot.add(leaf);
            crown.add(pivot);
        }
        palm.add(crown);
        add(palm, x, 0, z);
    });
    neon(70, 0.04, 0.08, PINK, 0, 0.03, 1.7);
    neon(70, 0.04, 0.08, CYAN, 0, 0.03, 2.1);

    // Optimizare: toate obiectele statice cu acelasi material devin un singur mesh.
    // Sute de apeluri de desenare devin cateva zeci, deci cadre constante si pe placi video slabe.
    [...doors, enterSign, ...arrows].forEach((item) => item.traverse((o) => (o.userData.dynamic = true)));
    scene.updateMatrixWorld(true);
    const buckets = new Map();
    const merged = [];
    scene.traverse((object) => {
        if (!object.isMesh || object.userData.dynamic || object.material.transparent) return;
        let geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
        geometry.applyMatrix4(object.matrixWorld);
        if (!buckets.has(object.material)) buckets.set(object.material, []);
        buckets.get(object.material).push(geometry);
        merged.push(object);
    });
    merged.forEach((object) => object.parent.remove(object));
    buckets.forEach((geometries, material) => {
        const geometry = new THREE.BufferGeometry();
        ['position', 'normal', 'uv'].forEach((name) => {
            const size = geometries[0].attributes[name].itemSize;
            const total = geometries.reduce((sum, g) => sum + g.attributes[name].array.length, 0);
            const array = new Float32Array(total);
            let offset = 0;
            geometries.forEach((g) => {
                array.set(g.attributes[name].array, offset);
                offset += g.attributes[name].array.length;
                if (name === 'uv') g.dispose();
            });
            geometry.setAttribute(name, new THREE.BufferAttribute(array, size));
        });
        geometry.computeBoundingSphere();
        const mesh = new THREE.Mesh(geometry, material);
        mesh.matrixAutoUpdate = false;
        scene.add(mesh);
    });
    scene.traverse((object) => {
        if (object.isMesh || object.isSprite) object.matrixAutoUpdate = !!object.userData.dynamic;
        if (object.isMesh || object.isSprite) object.updateMatrix();
    });
    // Trimitem toate texturile la placa video acum, nu in mijlocul zborului cand intra in cadru.
    const uploadTextures = () => {
        scene.traverse((object) => {
            const material = object.material;
            if (!material) return;
            [material.map, material.emissiveMap].forEach((texture) => {
                if (texture && texture.image) renderer.initTexture(texture);
            });
        });
    };

    const startPoint = new THREE.Vector3(0, 2.6, 29);
    const positions = new THREE.CatmullRomCurve3([
        startPoint,
        new THREE.Vector3(0, 2.2, 9),
        new THREE.Vector3(0, 1.9, -2.5),
        new THREE.Vector3(0, 2.1, -7.72),
    ]);
    const targets = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 4.3, 0),
        new THREE.Vector3(0, 2.3, -6),
        new THREE.Vector3(0, 2.1, -8.9),
        new THREE.Vector3(0, 2.1, -8.9),
    ]);

    const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const DURATION = 5000;
    const sway = { x: 0, y: 0 };
    const swayFrom = { x: 0, y: 0 };
    const point = new THREE.Vector3();
    let startedAt = 0;
    let finished = false;
    let frame = 0;
    let lastGap = 0;
    let frameAvg = 17;
    let frameCount = 0;
    let quality = 1;

    // Limitam numarul de pixeli desenati: ecranele mari/dense nu mai sufoca placa video.
    const PIXEL_BUDGET = lite ? 1.1e6 : 2.2e6;
    const resize = () => {
        const width = entry.clientWidth;
        const height = entry.clientHeight;
        const fit = Math.sqrt(PIXEL_BUDGET / Math.max(width * height, 1));
        renderer.setPixelRatio(Math.max(Math.min(basePixelRatio, fit) * quality, 0.5));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        const narrow = camera.aspect < 0.8;
        camera.fov = narrow ? 58 : 40;
        camera.updateProjectionMatrix();
        const halfWidth = Math.tan((camera.fov * Math.PI) / 360) * camera.aspect;
        startPoint.z = narrow ? Math.min(Math.max(11.2 / halfWidth, 29), 62) : 29;
        startPoint.y = narrow ? 3.4 : 2.6;
        positions.updateArcLengths();
        [enterSign, signGlow, ...arrows].forEach((item) => (item.visible = !narrow));
        enterButton.textContent = narrow ? 'Atinge ecranul pentru a intra' : 'Click oriunde pentru a intra';
    };

    const finish = () => {
        if (finished) return;
        finished = true;
        settle();
        entry.classList.add('leaving');
        document.documentElement.classList.remove('entry-lock');
        // Oprim randarea intrarii imediat: canvasul pastreaza ultimul cadru cat se estompeaza,
        // iar placa video ramane libera pentru scena PC-ului de pe pagina.
        cancelAnimationFrame(frame);
        setTimeout(() => {
            window.removeEventListener('resize', resize);
            renderer.dispose();
            entry.remove();
        }, 1300);
    };

    const render = (time) => {
        const gap = time - lastGap;
        lastGap = time;
        if (gap > 0 && gap < 250) frameAvg += (gap - frameAvg) * 0.1;
        // Calitatea se regleaza in asteptare (sub ~55 fps). In zbor doar daca e foarte greu,
        // pentru ca schimbarea rezolutiei in sine produce o mica sacadare.
        frameCount++;
        const limit = startedAt ? 30 : 18;
        if (frameCount > 60 && frameCount % 30 === 0 && frameAvg > limit && quality > 0.5) {
            quality = Math.max(0.5, quality * 0.85);
            resize();
            frameAvg = 16;
        }
        const flight = startedAt ? clamp01((time - startedAt) / DURATION) : 0;
        const eased = easeInOut(flight);

        positions.getPoint(eased, camera.position);
        if (!startedAt) {
            sway.x = Math.sin(time * 0.0003) * 0.6;
            sway.y = Math.sin(time * 0.0005) * 0.1;
        } else {
            // Leganarea de asteptare se stinge treptat, nu dispare brusc la click.
            const keep = 1 - easeInOut(clamp01(flight / 0.3));
            sway.x = swayFrom.x * keep;
            sway.y = swayFrom.y * keep;
        }
        camera.position.x += sway.x;
        camera.position.y += sway.y;
        targets.getPoint(eased, point);
        camera.lookAt(point);

        const open = easeInOut(clamp01((flight - 0.04) / 0.3));
        doors[0].position.x = -0.825 - open * 1.6;
        doors[1].position.x = 0.825 + open * 1.6;

        const fade = 1 - clamp01(flight / 0.14);
        const flicker = startedAt ? 1 : 0.86 + Math.sin(time * 0.004) * 0.14;
        enterSign.material.opacity = fade * flicker;
        signGlow.material.opacity = 0.22 * fade * flicker;
        arrows.forEach((arrow, index) => {
            const wave = (time * 0.0016 - index * 0.33) % 1;
            arrow.material.opacity = fade * (0.25 + 0.75 * Math.max(0, 1 - Math.abs(wave - 0.5) * 3));
        });

        renderer.render(scene, camera);
        if (flight >= 1) {
            finish();
            return;
        }
        frame = requestAnimationFrame(render);
    };

    const start = () => {
        if (startedAt || finished) return;
        startedAt = performance.now();
        swayFrom.x = sway.x;
        swayFrom.y = sway.y;
        entry.classList.add('flying');
    };

    resize();
    // Compilam shaderele si urcam texturile dinainte, ca zborul sa nu se blocheze.
    renderer.compile(scene, camera);
    uploadTextures();
    if (logoTexture.image) renderer.initTexture(logoTexture);
    window.addEventListener('resize', resize);
    canvas.addEventListener('click', start);
    enterButton.addEventListener('click', start);
    skipButton.addEventListener('click', finish);
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') finish();
        if (event.key === 'Enter') start();
    });
    frame = requestAnimationFrame(render);
})();

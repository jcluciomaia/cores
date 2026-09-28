document.addEventListener('DOMContentLoaded', () => {
    const galleryContainer = document.getElementById('gallery');
    const filtersContainer = document.getElementById('category-filters');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');
    const toast = document.getElementById('toast');

    let palettesData = [];
    let currentCategory = 'Todas';

    // ==========================================
    // Theme Management
    // ==========================================
    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.documentElement.setAttribute('data-theme', 'dark');
            updateThemeIcons('dark');
        } else {
            document.documentElement.setAttribute('data-theme', 'light');
            updateThemeIcons('light');
        }
    }

    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcons(newTheme);
    }

    function updateThemeIcons(theme) {
        if (theme === 'dark') {
            moonIcon.style.display = 'none';
            sunIcon.style.display = 'block';
        } else {
            moonIcon.style.display = 'block';
            sunIcon.style.display = 'none';
        }
    }

    themeToggleBtn.addEventListener('click', toggleTheme);

    // ==========================================
    // Data Fetching
    // ==========================================
    async function fetchPalettes() {
        try {
            const response = await fetch('paletas.json');
            if (!response.ok) throw new Error('Falha ao carregar os dados');
            palettesData = await response.json();

            initFilters();
            renderGallery();
        } catch (error) {
            console.error('Erro:', error);
            galleryContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Erro ao carregar as paletas.</p>';
        }
    }

    // ==========================================
    // Filters Management
    // ==========================================
    function initFilters() {
        const categories = ['Todas', ...new Set(palettesData.map(p => p.categoria))];

        filtersContainer.innerHTML = '';
        categories.forEach(category => {
            const li = document.createElement('li');
            const btn = document.createElement('button');
            btn.className = `filter-btn ${category === currentCategory ? 'active' : ''}`;
            btn.textContent = category;
            btn.addEventListener('click', () => {
                // Update active state
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Filter and render
                currentCategory = category;
                renderGallery();
            });

            li.appendChild(btn);
            filtersContainer.appendChild(li);
        });
    }

    // ==========================================
    // SVG Placeholder Generator
    // ==========================================
    // Creates a simple geometric SVG based on the palette colors
    function generateSVGPlaceholder(cores) {
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", "0 0 400 300");
        svg.setAttribute("preserveAspectRatio", "xMidYMid slice");

        // Background (first color)
        const rect = document.createElementNS(svgNS, "rect");
        rect.setAttribute("width", "100%");
        rect.setAttribute("height", "100%");
        rect.setAttribute("fill", cores[0]?.hex || "#ddd");
        svg.appendChild(rect);

        // Add some shapes using the other colors
        if (cores.length > 1) {
            const circle = document.createElementNS(svgNS, "circle");
            circle.setAttribute("cx", "200");
            circle.setAttribute("cy", "150");
            circle.setAttribute("r", "100");
            circle.setAttribute("fill", cores[1].hex);
            circle.setAttribute("opacity", "0.8");
            svg.appendChild(circle);
        }

        if (cores.length > 2) {
            const polygon = document.createElementNS(svgNS, "polygon");
            polygon.setAttribute("points", "0,300 400,300 400,100");
            polygon.setAttribute("fill", cores[2].hex);
            polygon.setAttribute("opacity", "0.7");
            svg.appendChild(polygon);
        }

        return svg.outerHTML;
    }

    // ==========================================
    // Rendering Gallery
    // ==========================================
    function renderGallery() {
        galleryContainer.innerHTML = '';

        const filteredData = currentCategory === 'Todas'
            ? palettesData
            : palettesData.filter(p => p.categoria === currentCategory);

        filteredData.forEach(palette => {
            const card = document.createElement('article');
            card.className = 'card';

            // Image section with fallback handling
            const imgContainer = document.createElement('div');
            imgContainer.className = 'card-img-container';

            const img = document.createElement('img');
            img.src = palette.imagem;
            img.alt = palette.titulo;
            img.loading = 'lazy'; // For performance

            // Fallback to SVG if image fails to load
            img.onerror = function() {
                imgContainer.innerHTML = generateSVGPlaceholder(palette.cores);
            };

            imgContainer.appendChild(img);

            // Header section
            const header = document.createElement('div');
            header.className = 'card-header';
            header.innerHTML = `
                <div class="card-category">${palette.categoria}</div>
                <h2 class="card-title">${palette.titulo}</h2>
            `;

            // Swatches section
            const swatchesContainer = document.createElement('div');
            swatchesContainer.className = 'card-swatches';

            palette.cores.forEach(cor => {
                const row = document.createElement('div');
                row.className = 'swatch-row';
                row.title = `Clique para copiar ${cor.hex}`;

                row.innerHTML = `
                    <div class="swatch-color" style="background-color: ${cor.hex};"></div>
                    <div class="swatch-info">
                        <span class="swatch-name">${cor.nome}</span>
                        <span class="swatch-codes">${cor.hex} • RGB: ${cor.rgb}</span>
                    </div>
                `;

                // Copy to clipboard event
                row.addEventListener('click', () => copyToClipboard(cor.hex));

                swatchesContainer.appendChild(row);
            });

            // Assemble card
            card.appendChild(imgContainer);
            card.appendChild(header);
            card.appendChild(swatchesContainer);

            galleryContainer.appendChild(card);
        });
    }

    // ==========================================
    // Clipboard & Toast
    // ==========================================
    let toastTimeout;
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showToast(`Copiado: ${text}`);
        } catch (err) {
            console.error('Falha ao copiar', err);
            // Fallback for older browsers
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(`Copiado: ${text}`);
            } catch (err) {
                console.error('Fallback falhou', err);
            }
            document.body.removeChild(textArea);
        }
    }

    function showToast(message) {
        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
        }, 2000);
    }

    // ==========================================
    // Initialization
    // ==========================================
    initTheme();
    fetchPalettes();
});

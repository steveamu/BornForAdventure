// script.js – all core interactions

document.addEventListener('DOMContentLoaded', () => {
    initCart();
    initNavbar();
    renderProducts();
    initMobileMenu();
    updateActiveLink();
});

// --- Navbar Scroll Effect ---
function initNavbar() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    // Check path to handle transparency logic (only transparent on home)
    const isHome = window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    
    if (!isHome) {
        navbar.classList.add('scrolled');
    } else {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }
}

// --- Mobile Menu ---
function initMobileMenu() {
    // Placeholder for mobile menu logic
    const menuBtn = document.querySelector('.mobile-menu-btn');
    // Implement drawer toggle if needed
}

// --- Active Link Highlight ---
function updateActiveLink() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === path || (path === '/' && link.getAttribute('href') === 'index.html')) {
            link.style.color = 'var(--color-accent)';
        }
    });
}

function getCategoryLabel(category) {
    const categoryLabels = {
        tops: "TOPS",
        cap: "CAPS",
        hoody: "HOODY"
    };
    return categoryLabels[category] || "ALL PRODUCTS";
}

// --- Cart Logic ---
let cart = [];

// Cookie utility functions
function setCookie(name, value, days) {
    const expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) + ';expires=' + expires.toUTCString() + ';path=/';
}

function getCookie(name) {
    const nameEQ = name + '=';
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
    }
    return null;
}

function initCart() {
    // Check if it's a refresh (load time < 500ms ago)
    const lastLoad = localStorage.getItem('bfa_loadTime');
    const currentTime = Date.now();
    if (lastLoad && (currentTime - parseInt(lastLoad)) < 500) {
        cart = [];
    } else {
        // Load cart from local storage on navigation
        const savedCart = localStorage.getItem('bfa_cart');
        if (savedCart) {
            try {
                cart = JSON.parse(savedCart);
            } catch (e) {
                console.error('Error parsing cart from localStorage:', e);
                cart = [];
            }
        }
    }
    // Set current load time
    localStorage.setItem('bfa_loadTime', currentTime.toString());
    updateCartUI();

    // Cart Toggle
    const cartBtn = document.querySelector('.cart-btn');
    const closeCartBtn = document.querySelector('.close-cart-btn');
    const cartDrawer = document.querySelector('.cart-drawer');
    const continueBtn = document.querySelector('.continue-shopping');

    const toggleCart = () => {
        const wasOpen = cartDrawer.classList.contains('open');
        cartDrawer.classList.toggle('open');
        if (wasOpen && cartBtn) cartBtn.blur();
    };

    if (cartBtn) cartBtn.addEventListener('click', toggleCart);
    if (closeCartBtn) closeCartBtn.addEventListener('click', toggleCart);
    if (continueBtn) continueBtn.addEventListener('click', toggleCart);
}

function addToCart(productId) {
    if (window.bfaRequireAuth && !window.bfaRequireAuth()) {
        return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ ...product, quantity: 1 });
    }

    saveCart();
    updateCartUI();
    showToast(`${product.name} added to cart`);
    
    // Open cart
    document.querySelector('.cart-drawer').classList.add('open');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
}

function updateQuantity(productId, delta) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            updateCartUI();
        }
    }
}

function saveCart() {
    localStorage.setItem('bfa_cart', JSON.stringify(cart));
}

function updateCartUI() {
    // Update Badge
    const cartCountEl = document.querySelector('.cart-count');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (cartCountEl) {
        cartCountEl.textContent = totalItems;
        cartCountEl.style.display = totalItems > 0 ? 'flex' : 'none';
    }

    // Render Items
    const cartItemsContainer = document.querySelector('.cart-items-list');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; color:#9ca3af; margin-top:40px;">Your cart is empty.</p>';
    } else {
        cart.forEach(item => {
            total += item.price * item.quantity;
            const el = document.createElement('div');
            el.className = 'cart-item';
            el.style.cssText = 'display:flex; gap:16px; margin-bottom:24px;';
            el.innerHTML = `
                <img src="${item.image}" style="width:80px; height:100px; object-fit:cover; background:#f3f4f6;">
                <div style="flex:1;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                        <h4 style="font-size:14px; font-weight:700; text-transform:uppercase;">${item.name}</h4>
                        <button onclick="removeFromCart(${item.id})" style="border:none; background:none; cursor:pointer; color:#ef4444;">✕</button>
                    </div>
                    <p style="font-size:12px; color:#6b7280; margin-bottom:12px;">${getCategoryLabel(item.category)}</p>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; border:1px solid #e5e7eb;">
                            <button onclick="updateQuantity(${item.id}, -1)" style="padding:4px 8px; border:none; background:none; cursor:pointer;">-</button>
                            <span style="padding:4px 8px; font-size:12px; line-height:20px;">${item.quantity}</span>
                            <button onclick="updateQuantity(${item.id}, 1)" style="padding:4px 8px; border:none; background:none; cursor:pointer;">+</button>
                        </div>
                        <span style="font-weight:700;">${formatPrice(item.price * item.quantity)}</span>
                    </div>
                </div>
            `;
            cartItemsContainer.appendChild(el);
        });
    }

    // Update Total
    const cartTotalEl = document.querySelector('.cart-total-amount');
    if (cartTotalEl) cartTotalEl.textContent = formatPrice(total);
}

// --- Page Specific Rendering ---
function renderProducts() {
    // Render Featured (Home)
    const featuredContainer = document.getElementById('featured-products');
    if (featuredContainer) {
        products.slice(0, 3).forEach(product => {
            featuredContainer.appendChild(createProductCard(product));
        });
    }

    // Render Shop (Shop Page)
    const shopContainer = document.getElementById('shop-products');
    if (shopContainer) {
        const categoryFromUrl = (getUrlParam('category') || '').toLowerCase();
        const hasSelectedCategory = Boolean(categoryFromUrl);

        const filteredProducts = hasSelectedCategory
            ? products.filter(product => product.category === categoryFromUrl)
            : products;

        filteredProducts.forEach(product => {
            shopContainer.appendChild(createShopProductCard(product));
        });

        const categoryTitle = document.getElementById('current-category-title');
        if (categoryTitle) {
            categoryTitle.textContent = getCategoryLabel(categoryFromUrl);
        }

        const categoryDescription = document.getElementById('category-description');
        if (categoryDescription) {
            categoryDescription.textContent = hasSelectedCategory
                ? `Showing ${filteredProducts.length} product(s) in ${getCategoryLabel(categoryFromUrl)}.`
                : 'Explore our exclusive range of streetwear essentials. Minimalist designs meet premium quality.';
        }

        if (hasSelectedCategory && filteredProducts.length === 0) {
            shopContainer.innerHTML = '<p style="grid-column:1 / -1; text-align:center; color:#6b7280;">No products found for this category.</p>';
        }
    }

    // Render Single Product (Product Details)
    const productDetailContainer = document.getElementById('product-detail-container');
    if (productDetailContainer) {
        const id = parseInt(getUrlParam('id'));
        const product = products.find(p => p.id === id);
        
        if (product) {
            document.title = `${product.name} | BORN FOR ADVENTURE`;
            productDetailContainer.innerHTML = `
                <div class="product-details-grid">
                    <div style="background-color:#f3f4f6; aspect-ratio:3/4;">
                        <img src="${product.image}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div style="display:flex; flex-direction:column; justify-content:center;">
                        <span style="color:var(--color-accent); font-weight:700; text-transform:uppercase; font-size:14px; margin-bottom:8px;">${getCategoryLabel(product.category)}</span>
                        <h1 style="font-size:3rem; font-weight:700; text-transform:uppercase; line-height:1; margin-bottom:16px;">${product.name}</h1>
                        <div style="font-size:1.5rem; font-weight:700; margin-bottom:24px;">${formatPrice(product.price)}</div>
                        <p style="color:#4b5563; margin-bottom:32px;">${product.description}</p>
                        
                        <div style="margin-bottom:32px;">
                            <label style="display:block; font-weight:700; text-transform:uppercase; font-size:12px; margin-bottom:12px;">Select Size</label>
                            <div class="size-selector">
                                <button class="size-btn">S</button>
                                <button class="size-btn active">M</button>
                                <button class="size-btn">L</button>
                                <button class="size-btn">XL</button>
                            </div>
                        </div>

                        <button onclick="addToCart(${product.id})" class="btn btn-primary btn-block">Add to Cart</button>
                    </div>
                </div>
            `;
            
            // Size selection logic
            const sizeBtns = productDetailContainer.querySelectorAll('.size-btn');
            sizeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    sizeBtns.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });

        } else {
            productDetailContainer.innerHTML = '<div style="text-align:center; padding:100px;"><h2>Product not found</h2><a href="shop.html" class="btn btn-outline" style="color:black; border-color:black; margin-top:20px;">Back to Shop</a></div>';
        }
    }
}

function createProductCard(product) {
    const div = document.createElement('div');
    div.className = 'product-card fade-in-up';
    div.innerHTML = `
        <div class="product-image-wrapper">
            <a href="product.html?id=${product.id}">
                <img src="${product.image}" alt="${product.name}" class="product-image">
            </a>
            <div class="add-to-cart-overlay">
                <button onclick="addToCart(${product.id})" class="btn btn-card">ADD TO CART</button>
            </div>
        </div>
        <div class="product-info">
            <div>
                <h3 class="product-title"><a href="product.html?id=${product.id}">${product.name}</a></h3>
                <span class="product-category">${getCategoryLabel(product.category)}</span>
            </div>
            <span class="product-price">${formatPrice(product.price)}</span>
        </div>
    `;
    return div;
}

function createShopProductCard(product) {
    const div = document.createElement('div');
    div.className = 'product-card fade-in-up';
    div.innerHTML = `
        <div class="product-image-wrapper">
            <a href="product.html?id=${product.id}">
                <img src="${product.image}" alt="${product.name}" class="product-image">
            </a>
            <div class="add-to-cart-overlay">
                <button onclick="addToCart(${product.id})" class="btn btn-card">ADD TO CART</button>
            </div>
        </div>
        <div class="product-info">
            <div>
                <h3 class="product-title">
                    <a href="product.html?id=${product.id}">${product.name}</a>
                </h3>
            </div>
            <span class="product-price">${formatPrice(product.price)}</span>
        </div>
    `;
    return div;
}

// Enhanced checkout function
function checkout() {
    if (window.bfaRequireAuth && !window.bfaRequireAuth()) {
        return;
    }
    if (cart.length === 0) {
        showToast('Your cart is empty!');
        return;
    }

    // Simple checkout - just show a message
    showToast('Checkout functionality would be implemented here!');
    // For now, just clear the cart
    cart = [];
    saveCart();
    updateCartUI();
    document.querySelector('.cart-drawer').classList.remove('open');
}

// Connect checkout button
document.addEventListener('DOMContentLoaded', () => {
    const checkoutBtn = document.querySelector('.cart-footer .btn-primary');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', checkout);
    }
});

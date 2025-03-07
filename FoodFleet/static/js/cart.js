// Cart management
let cart = [];

// Initialize cart from localStorage
function initCart() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
        updateCheckoutSummary();
    }
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    updateCheckoutSummary();
}

// Update cart count in the UI
function updateCartCount() {
    const cartCount = document.getElementById('cartCount');
    if (cartCount) {
        cartCount.textContent = cart.reduce((total, item) => total + item.quantity, 0);
    }
}

// Update checkout summary if on checkout page
function updateCheckoutSummary() {
    const orderItems = document.getElementById('orderItems');
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');

    if (orderItems && subtotalElement && totalElement) {
        orderItems.innerHTML = '';
        let subtotal = 0;

        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;

            const itemElement = document.createElement('div');
            itemElement.className = 'd-flex justify-content-between mb-2';
            itemElement.innerHTML = `
                <span>${item.name} × ${item.quantity}</span>
                <span>₹${itemTotal.toFixed(2)}</span>
            `;
            orderItems.appendChild(itemElement);
        });

        // Calculate GST (5%)
        const gst = subtotal * 0.05;

        // Calculate delivery fee
        const deliveryFee = subtotal < 300 ? 40 : 0;

        // Add GST row
        const gstElement = document.createElement('div');
        gstElement.className = 'd-flex justify-content-between mb-2';
        gstElement.innerHTML = `
            <span>GST (5%)</span>
            <span>₹${gst.toFixed(2)}</span>
        `;
        orderItems.appendChild(gstElement);

        // Add delivery fee row
        const deliveryElement = document.createElement('div');
        deliveryElement.className = 'd-flex justify-content-between mb-2';
        deliveryElement.innerHTML = `
            <span>Delivery Fee ${subtotal >= 300 ? '(Free)' : ''}</span>
            <span>₹${deliveryFee.toFixed(2)}</span>
        `;
        orderItems.appendChild(deliveryElement);

        subtotalElement.textContent = `₹${subtotal.toFixed(2)}`;
        totalElement.textContent = `₹${(subtotal + gst + deliveryFee).toFixed(2)}`;
    }
}

// Add item to cart
function addToCart(id, name, price) {
    const existingItem = cart.find(item => item.id === id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: id,
            name: name,
            price: price,
            quantity: 1
        });
    }

    saveCart();
    showCartNotification();
}

// Remove item from cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    renderCart();
}

// Update item quantity
function updateQuantity(id, delta) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            removeFromCart(id);
        } else {
            saveCart();
            renderCart();
        }
    }
}

// Calculate cart total
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Render cart contents
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');

    if (!cartItems) return;

    cartItems.innerHTML = '';

    cart.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'cart-item';
        itemElement.innerHTML = `
            <div>
                <h6>${item.name}</h6>
                <small>₹${item.price.toFixed(2)} × ${item.quantity}</small>
            </div>
            <div>
                <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity('${item.id}', -1)">-</button>
                <button class="btn btn-sm btn-outline-secondary" onclick="updateQuantity('${item.id}', 1)">+</button>
                <button class="btn btn-sm btn-outline-danger" onclick="removeFromCart('${item.id}')">×</button>
            </div>
        `;
        cartItems.appendChild(itemElement);
    });

    if (cartTotal) {
        const subtotal = calculateTotal();
        const gst = subtotal * 0.05;
        const deliveryFee = subtotal < 300 ? 40 : 0;
        cartTotal.textContent = (subtotal + gst + deliveryFee).toFixed(2);
    }
}

// Show/hide cart overlay
function toggleCart() {
    const cartOverlay = document.getElementById('cartOverlay');
    cartOverlay.style.display = cartOverlay.style.display === 'block' ? 'none' : 'block';
    renderCart();
}

function closeCart() {
    document.getElementById('cartOverlay').style.display = 'none';
}

// Show notification when item is added
function showCartNotification() {
    const notification = document.createElement('div');
    notification.className = 'toast position-fixed bottom-0 end-0 m-3';
    notification.innerHTML = `
        <div class="toast-body">
            Item added to cart!
        </div>
    `;
    document.body.appendChild(notification);

    const toast = new bootstrap.Toast(notification, { delay: 2000 });
    toast.show();

    setTimeout(() => {
        notification.remove();
    }, 2000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initCart();

    const cartButton = document.getElementById('cartButton');
    if (cartButton) {
        cartButton.addEventListener('click', toggleCart);
    }

    // Handle checkout form submission
    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) {
        updateCheckoutSummary();

        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            placeOrderBtn.addEventListener('click', async (e) => {
                e.preventDefault();

                if (!checkoutForm.checkValidity()) {
                    checkoutForm.reportValidity();
                    return;
                }

                try {
                    const response = await fetch('/api/place-order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            items: cart,
                            customerInfo: {
                                name: document.getElementById('name').value,
                                email: document.getElementById('email').value,
                                phone: document.getElementById('phone').value,
                                pincode: document.getElementById('pincode').value,
                                address: document.getElementById('address').value,
                                notes: document.getElementById('notes').value
                            }
                        })
                    });

                    const data = await response.json();
                    if (data.success) {
                        localStorage.removeItem('cart');
                        window.location.href = '/confirmation';
                    } else {
                        if (data.error === "Delivery not available in this area") {
                            document.getElementById('pincode').classList.add('is-invalid');
                            document.getElementById('pincodeError').style.display = 'block';
                        } else {
                            alert(data.error || 'Failed to place order. Please try again.');
                        }
                    }
                } catch (error) {
                    console.error('Error placing order:', error);
                    alert('There was an error placing your order. Please try again.');
                }
            });
        }
    }
});
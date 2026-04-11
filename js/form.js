// form.js – contact form with API integration

const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contact-form');
    
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                message: document.getElementById('message').value
            };

            try {
                const response = await fetch(`${API_URL}/contact`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    showToast('Message sent successfully! We\'ll get back to you soon.');
                    contactForm.reset();
                } else {
                    showToast('Error: ' + data.message);
                }
            } catch (error) {
                showToast('Error sending message. Please try again.');
                console.error('Contact form error:', error);
            }
        });
    }
});
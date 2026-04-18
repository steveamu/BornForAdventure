        // Dashboard navigation
        document.querySelectorAll('.dashboard-nav .nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Remove active class from all nav items
                document.querySelectorAll('.dashboard-nav .nav-item').forEach(nav => {
                    nav.classList.remove('active');
                });
                
                // Add active class to clicked item
                item.classList.add('active');
                
                // Hide all sections
                document.querySelectorAll('.dashboard-section').forEach(section => {
                    section.classList.remove('active');
                });
                
                // Show selected section
                const sectionId = item.getAttribute('data-section');
                if (sectionId) {
                    const targetSection = document.getElementById(sectionId);
                    if (targetSection) {
                        targetSection.classList.add('active');
                    }
                }
            });
        });

        // Logout function
        function logout() {
            if (window.bfaLogout) {
                window.bfaLogout();
            } else {
                window.location.href = 'index.html';
            }
        }
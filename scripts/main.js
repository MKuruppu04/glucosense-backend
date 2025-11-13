// Blood Glucose Monitoring System - Real-time Simulation
document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Close mobile menu when clicking on a nav link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Add active class to nav links on scroll
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-links a');

    function highlightNav() {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            
            if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
                current = `#${section.getAttribute('id')}`;
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === current) {
                item.classList.add('active');
            }
        });
    }

    window.addEventListener('scroll', highlightNav);
    highlightNav();

    // ========== GLUCOSE MONITORING SYSTEM ==========
    
    // Monitoring state
    let isMonitoring = false;
    let isPaused = false;
    let monitoringInterval = null;
    let glucoseHistory = [];
    let previousGlucose = 95; // Starting value
    let chart = null;
    
    // WebSocket connection state
    let socket = null;
    let isConnected = false;
    let useRealData = false; // Toggle between simulation and real data
    let raspberryPiIP = 'localhost'; // Default - user should update this
    let raspberryPiPort = '5000';

    // DOM elements
    const statusIndicator = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const currentTime = document.getElementById('current-time');
    const glucoseValue = document.getElementById('glucose-value');
    const glucoseStatus = document.getElementById('glucose-status');
    const trendIcon = document.getElementById('trend-icon');
    const trendText = document.getElementById('trend-text');
    
    // Sensor readings
    const redLED = document.getElementById('red-led');
    const irLED = document.getElementById('ir-led');
    const heartRate = document.getElementById('heart-rate');
    const spo2 = document.getElementById('spo2');
    const irIntensity = document.getElementById('ir-intensity');
    const absorption = document.getElementById('absorption');
    const signalQuality = document.getElementById('signal-quality');
    
    // Statistics
    const avgGlucose = document.getElementById('avg-glucose');
    const maxGlucose = document.getElementById('max-glucose');
    const minGlucose = document.getElementById('min-glucose');
    const readingCount = document.getElementById('reading-count');
    
    // Control buttons
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    const connectionStatus = document.getElementById('connection-status');
    const dataSourceText = document.getElementById('data-source');

    // Update current time
    function updateTime() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        currentTime.textContent = `${hours}:${minutes}:${seconds}`;
    }

    // Simulate realistic glucose reading with natural variation
    function simulateGlucoseReading() {
        // Natural glucose fluctuation (±2-5 mg/dL per reading)
        const variation = (Math.random() - 0.5) * 5;
        let newGlucose = previousGlucose + variation;
        
        // Add occasional larger trends (post-meal spike or exercise dip)
        if (Math.random() < 0.1) {
            newGlucose += (Math.random() - 0.5) * 15;
        }
        
        // Keep within realistic bounds (60-180 mg/dL)
        newGlucose = Math.max(60, Math.min(180, newGlucose));
        
        previousGlucose = newGlucose;
        return Math.round(newGlucose);
    }

    // Simulate MAX30102 sensor readings
    function simulateMAX30102() {
        return {
            redLED: Math.floor(50000 + Math.random() * 150000),
            irLED: Math.floor(45000 + Math.random() * 145000),
            heartRate: Math.floor(65 + Math.random() * 20),
            spo2: Math.floor(95 + Math.random() * 5)
        };
    }

    // Simulate IR sensor readings
    function simulateIRSensor(glucose) {
        // IR absorption correlates with glucose level
        const baseAbsorption = 35 + (glucose - 90) * 0.15;
        const absorption = Math.max(25, Math.min(55, baseAbsorption + (Math.random() - 0.5) * 3));
        
        return {
            intensity: Math.floor(8000 + Math.random() * 4000),
            absorption: absorption.toFixed(2),
            quality: absorption > 30 && absorption < 50 ? 'Good' : 'Fair'
        };
    }

    // Update glucose display
    function updateGlucoseDisplay(glucose) {
        glucoseValue.textContent = glucose;
        
        // Update status badge
        let status = 'normal';
        let statusText = 'Normal';
        
        if (glucose < 70) {
            status = 'low';
            statusText = 'Low';
        } else if (glucose > 140) {
            status = 'high';
            statusText = 'High';
        }
        
        glucoseStatus.className = `badge ${status}`;
        glucoseStatus.textContent = statusText;
    }

    // Update trend indicator
    function updateTrend(current, previous) {
        const diff = current - previous;
        let icon = 'fa-arrow-right';
        let text = 'Stable';
        let color = '#64748b';
        
        if (diff > 3) {
            icon = 'fa-arrow-up';
            text = 'Rising';
            color = '#f59e0b';
        } else if (diff < -3) {
            icon = 'fa-arrow-down';
            text = 'Falling';
            color = '#10b981';
        }
        
        trendIcon.className = `fas ${icon}`;
        trendIcon.style.color = color;
        trendText.textContent = text;
        trendText.style.color = color;
    }

    // Update sensor readings
    function updateSensorReadings(glucose) {
        const max30102 = simulateMAX30102();
        const irSensor = simulateIRSensor(glucose);
        
        redLED.textContent = max30102.redLED.toLocaleString();
        irLED.textContent = max30102.irLED.toLocaleString();
        heartRate.textContent = `${max30102.heartRate} bpm`;
        spo2.textContent = `${max30102.spo2} %`;
        
        irIntensity.textContent = irSensor.intensity.toLocaleString();
        absorption.textContent = `${irSensor.absorption} %`;
        signalQuality.textContent = irSensor.quality;
    }

    // Update statistics
    function updateStatistics() {
        if (glucoseHistory.length === 0) return;
        
        const sum = glucoseHistory.reduce((a, b) => a + b, 0);
        const avg = (sum / glucoseHistory.length).toFixed(1);
        const max = Math.max(...glucoseHistory);
        const min = Math.min(...glucoseHistory);
        
        avgGlucose.textContent = `${avg} mg/dL`;
        maxGlucose.textContent = `${max} mg/dL`;
        minGlucose.textContent = `${min} mg/dL`;
        readingCount.textContent = glucoseHistory.length;
    }

    // Initialize Chart.js
    function initializeChart() {
        const ctx = document.getElementById('glucose-chart').getContext('2d');
        
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Glucose Level (mg/dL)',
                    data: [],
                    borderColor: '#0ea5e9',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointBackgroundColor: '#0ea5e9',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleFont: {
                            size: 14
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return `Glucose: ${context.parsed.y} mg/dL`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 50,
                        max: 200,
                        ticks: {
                            stepSize: 20,
                            font: {
                                size: 12
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 45
                        },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Update chart with new data
    function updateChart(glucose) {
        const now = new Date();
        const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        
        // Keep only last 30 readings
        if (chart.data.labels.length >= 30) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(glucose);
        chart.update('none'); // Update without animation for smooth real-time updates
    }

    // Main monitoring loop
    function performMonitoring() {
        if (isPaused) return;
        
        // Only run simulation if not using real data
        if (!useRealData || !isConnected) {
            const previousValue = glucoseHistory.length > 0 ? glucoseHistory[glucoseHistory.length - 1] : previousGlucose;
            const glucose = simulateGlucoseReading();
            
            glucoseHistory.push(glucose);
            
            updateGlucoseDisplay(glucose);
            updateTrend(glucose, previousValue);
            updateSensorReadings(glucose);
            updateStatistics();
            updateChart(glucose);
        }
        // Real data is handled by WebSocket callback
    }

    // ========== WEBSOCKET CONNECTION ==========
    
    function connectToRaspberryPi() {
        // Connect to Raspberry Pi WebSocket server
        // User needs to update the raspberryPiIP variable with their RPi's IP address
        try {
            console.log(`Connecting to Raspberry Pi at ${raspberryPiIP}:${raspberryPiPort}...`);
            
            // Create Socket.IO connection
            socket = io(`http://${raspberryPiIP}:${raspberryPiPort}`, {
                transports: ['websocket'],
                reconnection: true,
                reconnectionDelay: 1000,
                reconnectionAttempts: 5
            });
            
            // Connection established
            socket.on('connect', function() {
                console.log('Connected to Raspberry Pi glucose monitor');
                isConnected = true;
                updateConnectionStatus(true);
                
                // Request initial data
                socket.emit('start_monitoring');
            });
            
            // Receive sensor data from Raspberry Pi
            socket.on('sensor_data', function(data) {
                if (!isPaused && useRealData) {
                    processRealSensorData(data);
                }
            });
            
            // Handle connection response
            socket.on('connection_response', function(data) {
                console.log('Server response:', data.message);
                showNotification('Connected to Raspberry Pi', 'success');
            });
            
            // Handle errors
            socket.on('sensor_error', function(data) {
                console.error('Sensor error:', data.error);
                showNotification('Sensor error: ' + data.error, 'error');
            });
            
            // Connection lost
            socket.on('disconnect', function() {
                console.log('Disconnected from Raspberry Pi');
                isConnected = false;
                updateConnectionStatus(false);
                showNotification('Disconnected from Raspberry Pi', 'warning');
            });
            
            // Reconnection attempt
            socket.on('reconnect_attempt', function() {
                console.log('Attempting to reconnect...');
            });
            
            // Reconnection failed
            socket.on('reconnect_failed', function() {
                console.log('Failed to reconnect to Raspberry Pi');
                showNotification('Failed to connect to Raspberry Pi. Check IP address.', 'error');
                // Fall back to simulation mode
                useRealData = false;
                updateDataSourceDisplay();
            });
            
        } catch (error) {
            console.error('Error connecting to Raspberry Pi:', error);
            showNotification('Connection error. Using simulation mode.', 'error');
            isConnected = false;
            updateConnectionStatus(false);
        }
    }
    
    function disconnectFromRaspberryPi() {
        if (socket) {
            socket.emit('stop_monitoring');
            socket.disconnect();
            socket = null;
            isConnected = false;
            updateConnectionStatus(false);
            console.log('Disconnected from Raspberry Pi');
        }
    }
    
    function processRealSensorData(data) {
        // Process real sensor data received from Raspberry Pi
        const previousValue = glucoseHistory.length > 0 ? 
                            glucoseHistory[glucoseHistory.length - 1] : data.glucose;
        
        // Store glucose reading
        glucoseHistory.push(data.glucose);
        
        // Update all displays
        updateGlucoseDisplay(data.glucose);
        updateTrend(data.glucose, previousValue);
        updateRealSensorReadings(data);
        updateStatistics();
        updateChart(data.glucose);
    }
    
    function updateRealSensorReadings(data) {
        // Update display with real sensor data from Raspberry Pi
        redLED.textContent = data.red_led.toLocaleString();
        irLED.textContent = data.ir_led.toLocaleString();
        heartRate.textContent = `${data.heart_rate} bpm`;
        spo2.textContent = `${data.spo2} %`;
        
        irIntensity.textContent = data.ir_intensity.toLocaleString();
        absorption.textContent = `${data.absorption} %`;
        signalQuality.textContent = data.signal_quality;
    }
    
    function updateConnectionStatus(connected) {
        if (connectionStatus) {
            if (connected) {
                connectionStatus.innerHTML = '<i class="fas fa-check-circle"></i> Connected to Raspberry Pi';
                connectionStatus.className = 'connection-status connected';
            } else {
                connectionStatus.innerHTML = '<i class="fas fa-times-circle"></i> Not Connected';
                connectionStatus.className = 'connection-status disconnected';
            }
        }
    }
    
    function updateDataSourceDisplay() {
        if (dataSourceText) {
            if (useRealData && isConnected) {
                dataSourceText.innerHTML = '<i class="fas fa-microchip"></i> Live Sensor Data';
                dataSourceText.className = 'data-source real-data';
            } else {
                dataSourceText.innerHTML = '<i class="fas fa-vial"></i> Simulation Mode';
                dataSourceText.className = 'data-source simulation';
            }
        }
    }
    
    function showNotification(message, type = 'info') {
        // Show notification to user
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
    
    // Start monitoring
    function startMonitoring() {
        if (isMonitoring) return;
        
        isMonitoring = true;
        isPaused = false;
        statusIndicator.classList.add('active');
        statusIndicator.classList.remove('inactive');
        statusText.textContent = 'Monitoring Active';
        
        // Initialize chart if not already done
        if (!chart) {
            initializeChart();
        }
        
        // Perform first reading immediately
        performMonitoring();
        
        // Continue monitoring every 2 seconds
        monitoringInterval = setInterval(performMonitoring, 2000);
    }

    // Pause/Resume monitoring
    pauseBtn.addEventListener('click', function() {
        isPaused = !isPaused;
        const icon = this.querySelector('i');
        
        if (isPaused) {
            icon.className = 'fas fa-play';
            this.title = 'Resume monitoring';
            statusText.textContent = 'Monitoring Paused';
            statusIndicator.classList.remove('active');
            statusIndicator.classList.add('inactive');
        } else {
            icon.className = 'fas fa-pause';
            this.title = 'Pause monitoring';
            statusText.textContent = 'Monitoring Active';
            statusIndicator.classList.add('active');
            statusIndicator.classList.remove('inactive');
        }
    });

    // Reset monitoring
    resetBtn.addEventListener('click', function() {
        if (confirm('Reset all monitoring data?')) {
            glucoseHistory = [];
            previousGlucose = 95;
            
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update();
            }
            
            updateStatistics();
            glucoseValue.textContent = '--';
            trendText.textContent = 'Stable';
            trendIcon.className = 'fas fa-arrow-right';
            trendIcon.style.color = '#64748b';
            trendText.style.color = '#64748b';
        }
    });
    
    // Mode toggle button (Simulation vs Real Data)
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', function() {
            useRealData = !useRealData;
            
            if (useRealData) {
                // Switch to real data mode
                const userIP = prompt(
                    'Enter Raspberry Pi IP address:', 
                    raspberryPiIP
                );
                
                if (userIP) {
                    raspberryPiIP = userIP;
                    connectToRaspberryPi();
                } else {
                    useRealData = false;
                }
            } else {
                // Switch to simulation mode
                disconnectFromRaspberryPi();
                showNotification('Switched to simulation mode', 'info');
            }
            
            updateDataSourceDisplay();
            
            // Update button text
            const icon = this.querySelector('i');
            const text = this.querySelector('span');
            if (useRealData && isConnected) {
                icon.className = 'fas fa-vial';
                text.textContent = 'Switch to Simulation';
                this.classList.add('real-mode');
            } else {
                icon.className = 'fas fa-microchip';
                text.textContent = 'Connect to Raspberry Pi';
                this.classList.remove('real-mode');
            }
        });
    }

    // Update time every second
    setInterval(updateTime, 1000);
    updateTime();
    
    // Initialize connection status display
    updateConnectionStatus(false);
    updateDataSourceDisplay();

    // Start monitoring automatically after 1 second (in simulation mode)
    setTimeout(startMonitoring, 1000);

    // Scroll animations
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.glucose-card, .sensor-card, .chart-card, .tech-card, .stat-card');
        
        elements.forEach(element => {
            const elementPosition = element.getBoundingClientRect().top;
            const screenPosition = window.innerHeight / 1.3;
            
            if (elementPosition < screenPosition) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    document.querySelectorAll('.glucose-card, .sensor-card, .chart-card, .tech-card, .stat-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    });

    window.addEventListener('load', animateOnScroll);
    window.addEventListener('scroll', animateOnScroll);
});

# Blood Glucose Monitoring System
## Real-Time Non-Invasive Glucose Measurement with Raspberry Pi 4

A real-time blood glucose monitoring web application that receives live sensor data from a Raspberry Pi 4 equipped with IR and MAX30102 PPG sensors.

---

## 📋 Table of Contents
- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Hardware Requirements](#hardware-requirements)
- [Software Requirements](#software-requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Sensor Integration](#sensor-integration)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

---

## 🔍 Overview

This project implements a complete blood glucose monitoring system with:
- **Real-time data transmission** from Raspberry Pi to web interface via WebSocket
- **Dual mode operation**: Simulation mode for testing and Real sensor mode for live data
- **Live visualization** of glucose levels with Chart.js
- **Sensor fusion**: Combining MAX30102 PPG sensor and IR sensor readings
- **Signal processing**: Filtering and noise reduction of analog signals
- **Calibration support**: Adjustable parameters for accurate readings

---

## 🏗️ System Architecture

```
┌─────────────────────────┐
│   Raspberry Pi 4        │
│  ┌──────────────────┐   │
│  │  MAX30102 Sensor │   │     WebSocket
│  │  (I2C Interface) │───┼────  Connection
│  └──────────────────┘   │        │
│  ┌──────────────────┐   │        │
│  │   IR Sensor      │   │        │
│  │  (ADC Interface) │───┼────────┤
│  └──────────────────┘   │        │
│  ┌──────────────────┐   │        ↓
│  │  Flask Server    │   │   ┌──────────────┐
│  │  + Socket.IO     │◄──────│  Web Browser │
│  └──────────────────┘   │   │  (Client)    │
└─────────────────────────┘   └──────────────┘
```

**Data Flow:**
1. Sensors capture analog signals (RED LED, IR LED from MAX30102 + IR sensor)
2. Raspberry Pi applies bandpass filtering and noise reduction
3. Processed signals are used to calculate glucose concentration
4. Flask server broadcasts data via WebSocket every 2 seconds
5. Web client receives and visualizes data in real-time

---

## 🛠️ Hardware Requirements

### Raspberry Pi Setup
- **Board**: Raspberry Pi 4 (Model B) - 2GB RAM or higher
- **OS**: Raspberry Pi OS (Bullseye or later)
- **Sensors**:
  - **MAX30102** Pulse Oximeter and Heart-Rate Sensor
    - Interface: I2C
    - Operating Voltage: 3.3V
    - Red LED: 660nm
    - IR LED: 880nm
  - **IR Sensor** (for glucose measurement)
    - Interface: Analog (requires ADC)
    - Wavelength: Near-infrared spectrum
    
- **ADC** (Analog-to-Digital Converter):
  - **MCP3008** (8-channel 10-bit ADC) or similar
  - Interface: SPI
  - Operating Voltage: 2.7V - 5.5V

### Wiring Connections

#### MAX30102 to Raspberry Pi (I2C):
```
MAX30102    →    Raspberry Pi
VIN         →    3.3V (Pin 1)
GND         →    GND (Pin 6)
SDA         →    GPIO 2 (Pin 3)
SCL         →    GPIO 3 (Pin 5)
```

#### MCP3008 ADC to Raspberry Pi (SPI):
```
MCP3008     →    Raspberry Pi
VDD         →    3.3V (Pin 17)
VREF        →    3.3V
AGND        →    GND (Pin 20)
DGND        →    GND
CLK         →    GPIO 11 (Pin 23) - SCLK
DOUT        →    GPIO 9 (Pin 21) - MISO
DIN         →    GPIO 10 (Pin 19) - MOSI
CS/SHDN     →    GPIO 8 (Pin 24) - CE0
```

#### IR Sensor to MCP3008:
```
IR Sensor   →    MCP3008
Signal Out  →    CH0 (Pin 1)
VCC         →    3.3V
GND         →    GND
```

---

## 💻 Software Requirements

### Raspberry Pi
- Python 3.7 or higher
- pip (Python package manager)
- I2C and SPI enabled on Raspberry Pi

### Web Client
- Modern web browser (Chrome, Firefox, Edge, Safari)
- JavaScript enabled
- Socket.IO client library (loaded via CDN)

---

## 📥 Installation

### 1. Raspberry Pi Setup

#### Enable I2C and SPI:
```bash
sudo raspi-config
# Navigate to: Interface Options → I2C → Enable
# Navigate to: Interface Options → SPI → Enable
# Reboot when prompted
```

#### Install System Dependencies:
```bash
sudo apt-get update
sudo apt-get install -y python3-pip python3-dev python3-smbus i2c-tools
```

#### Clone Repository:
```bash
cd ~
git clone <your-repository-url>
cd personal-website
```

#### Install Python Packages:
```bash
cd server
pip3 install -r requirements.txt
```

#### Verify I2C Devices:
```bash
sudo i2cdetect -y 1
# You should see the MAX30102 sensor at address 0x57
```

### 2. Web Application Setup

The web application files are ready to use. Simply serve them using any web server or open `index.html` directly in a browser for testing.

For development:
```bash
# From the project root directory
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

---

## ⚙️ Configuration

### 1. Raspberry Pi Server Configuration

Edit `server/app.py` to adjust settings:

```python
# Sampling rate (seconds between readings)
SAMPLING_RATE = 2  # Default: 2 seconds

# Server port
PORT = 5000  # Default: 5000
```

### 2. Sensor Reader Configuration

Edit `server/sensor_reader.py` to customize sensor readings and calibration:

```python
class GlucoseSensorReader:
    def __init__(self):
        self.calibration_offset = 0      # Adjust after calibration
        self.calibration_slope = 1.0     # Adjust after calibration
```

### 3. Web Client Configuration

The web client will prompt for the Raspberry Pi IP address when you click "Connect to Raspberry Pi". 

You can also modify the default in `scripts/main.js`:

```javascript
let raspberryPiIP = '192.168.1.100';  // Replace with your RPi IP
let raspberryPiPort = '5000';
```

---

## 🚀 Usage

### Starting the System

#### 1. Start Raspberry Pi Server:
```bash
cd ~/personal-website/server
python3 app.py
```

You should see:
```
==================================================
Blood Glucose Monitoring Server
==================================================
Server starting on port 5000...
WebSocket endpoint: ws://[RPi-IP]:5000
==================================================
Starting sensor reading loop...
```

#### 2. Find Raspberry Pi IP Address:
```bash
hostname -I
```
Note this IP address (e.g., `192.168.1.100`)

#### 3. Open Web Application:
- Open `index.html` in a web browser
- Or navigate to the server hosting the web files

#### 4. Connect to Raspberry Pi:
- Click the **"Connect to Raspberry Pi"** button
- Enter your Raspberry Pi's IP address when prompted
- Wait for connection confirmation

### Using the Interface

#### Main Display:
- **Current Glucose Level**: Large display showing real-time glucose (mg/dL)
- **Status Badge**: Shows if glucose is Low (<70), Normal (70-140), or High (>140)
- **Trend Indicator**: Shows if glucose is Rising, Stable, or Falling

#### Sensor Readings:
- **MAX30102 Data**: Red LED, IR LED, Heart Rate, SpO2
- **IR Sensor Data**: Intensity, Absorption %, Signal Quality

#### Controls:
- **Pause/Resume**: Temporarily pause data updates
- **Reset**: Clear all historical data and restart
- **Mode Toggle**: Switch between Simulation and Real Data modes

#### Real-Time Chart:
- Displays last 30 glucose readings
- Updates automatically every 2 seconds
- Hover over points to see exact values

---

## 🔬 Sensor Integration

### Implementing Your Sensor Reading Logic

The template in `server/sensor_reader.py` needs to be customized with your actual sensor interfacing code.

#### Example: Reading MAX30102

```python
import board
import busio
from adafruit_max30102 import MAX30102

class GlucoseSensorReader:
    def setup_sensors(self):
        # Initialize I2C
        i2c = busio.I2C(board.SCL, board.SDA)
        
        # Initialize MAX30102
        self.max30102 = MAX30102(i2c)
        self.max30102.setup()
        
    def read_max30102(self):
        # Read sensor values
        red = self.max30102.read_red()
        ir = self.max30102.read_ir()
        
        # Calculate heart rate and SpO2
        hr = self.calculate_heart_rate(red, ir)
        spo2 = self.calculate_spo2(red, ir)
        
        return {
            'red_led': red,
            'ir_led': ir,
            'heart_rate': hr,
            'spo2': spo2
        }
```

#### Example: Reading IR Sensor via ADC

```python
import spidev

class GlucoseSensorReader:
    def setup_sensors(self):
        # Initialize SPI for MCP3008
        self.spi = spidev.SpiDev()
        self.spi.open(0, 0)
        self.spi.max_speed_hz = 1350000
        
    def read_adc(self, channel=0):
        # Read from MCP3008 ADC
        adc = self.spi.xfer2([1, (8 + channel) << 4, 0])
        data = ((adc[1] & 3) << 8) + adc[2]
        return data
        
    def read_ir_sensor(self):
        raw_value = self.read_adc(channel=0)
        
        # Apply your filtering algorithm
        filtered_value = self.apply_bandpass_filter(raw_value)
        
        # Convert to intensity
        ir_intensity = (filtered_value / 1023.0) * 12000
        
        # Calculate absorption (your formula here)
        absorption = self.calculate_absorption(filtered_value)
        
        return {
            'ir_intensity': int(ir_intensity),
            'absorption': absorption
        }
```

#### Implementing Glucose Calculation

Replace the placeholder in `calculate_glucose()` with your calibrated formula:

```python
def calculate_glucose(self, max30102_data, ir_data):
    # Your research-based formula here
    # This is based on your paper's methodology
    
    # Example formula structure (customize with your coefficients):
    red_ir_ratio = max30102_data['red_led'] / max30102_data['ir_led']
    ir_absorption = ir_data['absorption']
    
    # Apply your calibration formula
    glucose = (
        (ir_absorption * self.calibration_slope) + 
        self.calibration_offset + 
        (red_ir_ratio * correction_factor)
    )
    
    # Apply any additional corrections
    glucose = self.temperature_compensation(glucose)
    glucose = self.motion_artifact_correction(glucose)
    
    # Ensure realistic range
    glucose = max(40, min(400, glucose))
    
    return glucose
```

### Signal Processing & Filtering

Implement your filtering algorithms in the `apply_bandpass_filter()` method:

```python
from scipy import signal
import numpy as np

def apply_bandpass_filter(self, data):
    # Design butterworth bandpass filter
    fs = 100  # Sampling frequency
    lowcut = 0.5  # Hz
    highcut = 5.0  # Hz
    
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    
    b, a = signal.butter(4, [low, high], btype='band')
    filtered = signal.filtfilt(b, a, data)
    
    return filtered
```

### Calibration Procedure

1. Take reference glucose measurement with standard glucometer
2. Run calibration function:
```python
sensor = GlucoseSensorReader()
sensor.calibrate(reference_glucose=95, num_samples=10)
```
3. Calibration parameters are automatically calculated and stored
4. Repeat with multiple reference points for better accuracy

---

## 📡 API Reference

### REST Endpoints

#### GET `/api/status`
Check server status and get last reading

**Response:**
```json
{
  "status": "online",
  "timestamp": "2024-11-09 18:15:30",
  "last_reading": {
    "glucose": 105,
    "red_led": 125000,
    "ir_led": 115000,
    "heart_rate": 72,
    "spo2": 98,
    "ir_intensity": 9500,
    "absorption": 42.5,
    "signal_quality": "Good"
  }
}
```

#### POST `/api/calibrate`
Trigger sensor calibration (customize implementation)

### WebSocket Events

#### Client → Server:

**`connect`**
- Establish connection to server

**`start_monitoring`**
- Request to start sensor monitoring

**`stop_monitoring`**
- Request to stop sensor monitoring

**`request_data`**
- Manual request for current sensor data

#### Server → Client:

**`connection_response`**
```json
{
  "status": "connected",
  "message": "Connected to Raspberry Pi glucose monitor",
  "sampling_rate": 2
}
```

**`sensor_data`** (sent every 2 seconds)
```json
{
  "glucose": 105,
  "red_led": 125000,
  "ir_led": 115000,
  "heart_rate": 72,
  "spo2": 98,
  "ir_intensity": 9500,
  "absorption": 42.5,
  "signal_quality": "Good",
  "timestamp": "2024-11-09 18:15:30"
}
```

**`sensor_error`**
```json
{
  "error": "Sensor disconnected or malfunction"
}
```

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Cannot connect to Raspberry Pi
**Problem**: Web client shows "Failed to connect to Raspberry Pi"

**Solutions**:
- Verify Raspberry Pi is on same network as computer
- Check Raspberry Pi IP address with `hostname -I`
- Ensure Flask server is running on Raspberry Pi
- Check firewall settings allow port 5000
- Try accessing `http://[RPi-IP]:5000/api/status` in browser

#### 2. No sensor data displayed
**Problem**: Connected but showing "--" or zero values

**Solutions**:
- Check sensor wiring connections
- Verify I2C is enabled: `sudo i2cdetect -y 1`
- Check SPI is enabled: `ls /dev/spi*`
- Review server logs for errors: `journalctl -u glucose-monitor`
- Test sensors individually with example scripts

#### 3. Inaccurate glucose readings
**Problem**: Glucose values don't match reference meter

**Solutions**:
- Perform calibration with reference glucometer
- Check sensor placement and contact quality
- Verify filtering algorithms are properly implemented
- Adjust calibration coefficients
- Ensure stable power supply to sensors

#### 4. Connection keeps dropping
**Problem**: WebSocket disconnects frequently

**Solutions**:
- Check WiFi signal strength
- Reduce SAMPLING_RATE to reduce network traffic
- Use wired Ethernet connection if possible
- Check Raspberry Pi power supply (use official 3A adapter)

#### 5. High latency or lag
**Problem**: Significant delay in data updates

**Solutions**:
- Reduce chart history (change from 30 to 20 readings)
- Optimize filtering algorithms
- Use wired network connection
- Close other applications on Raspberry Pi

### Debug Mode

Enable debug logging in Flask server:

```python
# In app.py
socketio.run(app, host='0.0.0.0', port=5000, debug=True)
```

Enable browser console logging:
- Press `F12` in browser
- Check Console tab for error messages and connection logs

---

## 📊 Data Management

### Storing Historical Data

To store glucose readings for later analysis, add database integration:

```python
import sqlite3
from datetime import datetime

def save_reading(glucose, sensor_data):
    conn = sqlite3.connect('glucose_data.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS readings
                 (timestamp TEXT, glucose REAL, red_led INTEGER,
                  ir_led INTEGER, heart_rate INTEGER, spo2 INTEGER)''')
    
    c.execute('''INSERT INTO readings VALUES (?, ?, ?, ?, ?, ?)''',
              (datetime.now().isoformat(), glucose,
               sensor_data['red_led'], sensor_data['ir_led'],
               sensor_data['heart_rate'], sensor_data['spo2']))
    
    conn.commit()
    conn.close()
```

---

## ⚠️ Important Notes

### Medical Disclaimer
- This is a **research project and educational tool**
- **NOT FDA approved** for medical use
- **DO NOT** use for medical diagnosis or treatment decisions
- Always consult healthcare professionals for medical advice
- Use commercial, FDA-approved glucometers for medical decisions

### Safety Considerations
- Ensure proper electrical isolation
- Use only 3.3V power for sensors
- Do not expose sensors to excessive heat or moisture
- Follow proper hygiene when testing on skin
- Do not use if you have pacemaker or medical implants

### Accuracy Considerations
- Calibration is essential for accurate readings
- Multiple calibration points improve accuracy
- Environmental factors affect readings (temperature, humidity)
- Motion artifacts can cause inaccurate readings
- Regular recalibration recommended

---

## 📚 References

- Research paper on non-invasive glucose monitoring (ResearchGate Publication #349915751)
- MAX30102 datasheet and specifications
- Near-infrared spectroscopy principles
- Photoplethysmography (PPG) signal processing

---

## 🤝 Contributing

To customize this project for your specific research:
1. Implement your sensor reading algorithms in `server/sensor_reader.py`
2. Add your signal processing and filtering techniques
3. Integrate your glucose calculation formula based on research
4. Calibrate with reference glucose measurements
5. Test and validate against commercial glucometers

---

## 📄 License

This project is for educational and research purposes.

---

## 👥 Contact & Support

For technical issues or questions about integration:
- Review the troubleshooting section
- Check server logs for error messages
- Verify all hardware connections
- Ensure software dependencies are installed

---

**Built with**: Flask, Socket.IO, Chart.js, Raspberry Pi 4, MAX30102, IR Sensors

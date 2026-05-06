// ============================================================
//  FIRMWARE CLIENTE - Control de Acceso Biométrico IoT
//  ESP32 + AS608 + Pantalla LCD + Rele + Buzzer
//  Arquitectura: Cliente Web (HTTP JSON) a Servidor Local
// ============================================================

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>
#include <HardwareSerial.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ===================== CONFIGURACIÓN DE RED =================
const char* ssid = "Mired_WIFI";         // Cambiar por tu red
const char* password = "MiPassword123";  // Cambiar por tu contraseña
const String serverURL = "[http://192.168.1.100:8000/api/acceso](http://192.168.1.100:8000/api/acceso)"; // IP de la PC con Python

// ===================== PINES Y HARDWARE =====================
#define RXD2       16
#define TXD2       17
#define PIN_RELE   26   // Pin conectado al módulo de relé
#define PIN_BUZZER 27   // Pin conectado al buzzer
#define BTN_REG    13   // Botón para iniciar registro de nueva huella

HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===================== VARIABLES GLOBALES ===================
unsigned long releTimer = 0;
bool releActivo = false;
const int TIEMPO_APERTURA = 4000; // 4 segundos puerta abierta

// Control de botones (Debounce)
unsigned long lastBtnPress = 0;

void setup() {
  Serial.begin(115200);
  
  // Inicialización de pines
  pinMode(PIN_RELE, OUTPUT);
  digitalWrite(PIN_RELE, LOW); // Relé apagado (lógica positiva, ajustar según módulo)
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  pinMode(BTN_REG, INPUT_PULLUP);

  // Inicialización de LCD
  lcd.init();
  lcd.backlight();
  lcdMensaje("Iniciando...", "Sistema IoT v3");
  delay(1500);

  // Conexión WiFi
  conectarWiFi();

  // Inicialización de Sensor Biométrico
  mySerial.begin(57600, SERIAL_8N1, RXD2, TXD2);
  finger.begin(57600);
  if (finger.verifyPassword()) {
    Serial.println("Sensor AS608 detectado.");
  } else {
    Serial.println("Error: Sensor no encontrado.");
    lcdMensaje("Error Sensor", "Revisa cables");
    while (1) { delay(1); } // Detener ejecución
  }

  lcdMensaje("Sistema Listo", "Pon tu dedo");
}

void loop() {
  // Manejo de la conexión WiFi (reconectar si se cae)
  if (WiFi.status() != WL_CONNECTED) {
    conectarWiFi();
  }

  // Máquina de estados para el control del Relé (No bloqueante)
  if (releActivo && (millis() - releTimer >= TIEMPO_APERTURA)) {
    digitalWrite(PIN_RELE, LOW);
    releActivo = false;
    lcdMensaje("Sistema Listo", "Pon tu dedo");
  }

  // Leer botón de registro (para añadir nueva huella localmente y mandar al server)
  if (digitalRead(BTN_REG) == LOW && (millis() - lastBtnPress > 500)) {
    lastBtnPress = millis();
    registrarNuevaHuella();
  }

  // Ciclo principal de lectura: verificar si hay un dedo en el sensor
  if (!releActivo) { // Solo leer huella si la puerta está cerrada
    verificarHuella();
  }
}

// ===================== FUNCIONES PRINCIPALES =================

void verificarHuella() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return; // No hay dedo

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    lcdMensaje("Error lectura", "Intenta de nuevo");
    delay(1000);
    lcdMensaje("Sistema Listo", "Pon tu dedo");
    return;
  }

  p = finger.fingerFastSearch();
  if (p == FINGERPRINT_OK) {
    int idDetectado = finger.fingerID;
    int confianza = finger.confidence;
    Serial.printf("Huella detectada. ID: %d, Confianza: %d\n", idDetectado, confianza);
    
    lcdMensaje("Huella leida", "Verificando...");
    
    // Aquí es donde ocurre la magia IoT: Consultar al Servidor
    consultarServidor(idDetectado);
    
  } else {
    Serial.println("Huella no reconocida localmente.");
    sonidoError();
    lcdMensaje("Huella no", "Registrada");
    delay(2000);
    lcdMensaje("Sistema Listo", "Pon tu dedo");
  }
}

void consultarServidor(int huella_id) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL + "/verificar");
    http.addHeader("Content-Type", "application/json");

    // Crear el JSON a enviar {"huella_id": 5}
    StaticJsonDocument<200> jsonDoc;
    jsonDoc["huella_id"] = huella_id;
    String requestBody;
    serializeJson(jsonDoc, requestBody);

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println(httpResponseCode);
      Serial.println(response);

      // Deserializar la respuesta del servidor
      StaticJsonDocument<300> responseDoc;
      DeserializationError error = deserializeJson(responseDoc, response);

      if (!error) {
        String estado = responseDoc["estado"]; // "aprobado" o "denegado"
        String nombre = responseDoc["nombre"]; // Ej: "Ruben Lazo"

        if (estado == "aprobado") {
          lcdMensaje("Acceso Permitido", nombre);
          abrirPuerta();
        } else {
          lcdMensaje("Acceso Denegado", nombre);
          sonidoError();
          delay(2000);
          lcdMensaje("Sistema Listo", "Pon tu dedo");
        }
      }
    } else {
      Serial.print("Error en peticion HTTP: ");
      Serial.println(httpResponseCode);
      lcdMensaje("Error Servidor", "Fallo red");
      sonidoError();
      delay(2000);
      lcdMensaje("Sistema Listo", "Pon tu dedo");
    }
    http.end();
  }
}

void abrirPuerta() {
  digitalWrite(PIN_RELE, HIGH);
  sonidoExito();
  releActivo = true;
  releTimer = millis();
}

void registrarNuevaHuella() {
  lcdMensaje("Modo Registro", "Asignando ID...");
  int id = finger.templateCount + 1; // Asignar el siguiente ID disponible
  
  // Implementación simplificada del proceso de inscripción
  lcdMensaje("Pon dedo nuevo", "ID: " + String(id));
  while (finger.getImage() != FINGERPRINT_OK);
  finger.image2Tz(1);
  lcdMensaje("Retira dedo", "");
  delay(2000);
  while (finger.getImage() != FINGERPRINT_NOFINGER);
  lcdMensaje("Pon mismo dedo", "Otra vez");
  while (finger.getImage() != FINGERPRINT_OK);
  finger.image2Tz(2);
  
  if (finger.createModel() == FINGERPRINT_OK) {
    if (finger.storeModel(id) == FINGERPRINT_OK) {
      lcdMensaje("Huella Guardada", "Enviando a BD...");
      
      // Notificar al servidor que se creó una nueva huella
      if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverURL + "/registrar");
        http.addHeader("Content-Type", "application/json");
        StaticJsonDocument<200> jsonDoc;
        jsonDoc["huella_id"] = id;
        jsonDoc["accion"] = "nueva_huella";
        String req;
        serializeJson(jsonDoc, req);
        http.POST(req);
        http.end();
      }
      
      sonidoExito();
      delay(2000);
    }
  } else {
    lcdMensaje("Fallo Registro", "Intenta de nuevo");
    sonidoError();
    delay(2000);
  }
  lcdMensaje("Sistema Listo", "Pon tu dedo");
}

// ===================== FUNCIONES AUXILIARES ==================

void conectarWiFi() {
  lcdMensaje("Conectando WiFi", String(ssid));
  WiFi.begin(ssid, password);
  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    lcdMensaje("WiFi Conectado!", WiFi.localIP().toString());
    delay(1500);
  } else {
    lcdMensaje("Error WiFi", "Modo Offline");
    delay(1500);
  }
}

void lcdMensaje(String l1, String l2) {
  lcd.clear();
  lcd.setCursor(0, 0); lcd.print(l1.substring(0, 16));
  lcd.setCursor(0, 1); lcd.print(l2.substring(0, 16));
}

void sonidoExito() {
  tone(PIN_BUZZER, 2000, 150); // Frecuencia 2000Hz por 150ms
  delay(200);
  tone(PIN_BUZZER, 2500, 200);
}

void sonidoError() {
  tone(PIN_BUZZER, 500, 300);
  delay(400);
  tone(PIN_BUZZER, 500, 300);
}

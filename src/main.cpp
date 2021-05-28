#include <Arduino.h>

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include "SPIFFS.h"
#include <Arduino_JSON.h>
#include "MAX31855.h"

#define SSRPin 12

#define thermoDO 23  //MOSI
#define thermoCS 5   //CS
#define thermoCLK 18 //CLK 

// WiFi
const char* ssid = "Frednet";
const char* password = "00556255867124628729";

// Webserver
AsyncWebServer server(80);
AsyncEventSource events("/events");
JSONVar readings;

// Thermocouple
MAX31855 tc(thermoCLK, thermoCS, thermoDO);

// Timer variables
unsigned long lastTime = 0;
unsigned long timerDelay = 2500;

// Temperature variables
float tempIst = 0.0, tempSoll = 250.0;
float tempLow = 1000.0, tempHigh = 0.0;

// Histeresis for Temperature Control in °C
float tempHist = 1.0;

// Status variable
enum statusTypes
{
  started = 1,
  stopped = 0
};

int status = statusTypes::stopped;

// Get Sensor Readings and return JSON object
String getSensorReadings()
{
  readings["tempIst"] = String(tempIst);
  readings["tempSoll"] = String(tempSoll);

  if (status == statusTypes::started)
    readings["status"] = "started";
  else
    readings["status"] = "stopped";

  String jsonString = JSON.stringify(readings);
  return jsonString;
}

// Initialize SPIFFS
void initSPIFFS() 
{
  if (!SPIFFS.begin()) {
    Serial.println("An error has occurred while mounting SPIFFS");
  }
  else{
    Serial.println("SPIFFS mounted successfully");
  }
}

// Initialize WiFi
void initWiFi() 
{
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi ..");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print('.');
    delay(250);
  }
  Serial.println(WiFi.localIP());
}

void setup() 
{
  // Serial port for debugging purposes
  Serial.begin(115200);
  initWiFi();
  initSPIFFS();

  // Thermocouple
  tc.begin();

  // Web Server Root URL
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/index.html", "text/html");
  });
  // Favicon
  server.on("/favicon.ico", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(200, "image/png", "/favicon.png");
  });

  // Start + Stop
  server.on("/start", HTTP_GET, [](AsyncWebServerRequest *request){

    status = statusTypes::started;
    request->send(200);
  });
  
  server.on("/stop", HTTP_GET, [](AsyncWebServerRequest *request){
    
    status = statusTypes::stopped;
    request->send(200);
  });

  server.serveStatic("/", SPIFFS, "/");

  // Request for the latest sensor readings
  server.on("/readings", HTTP_GET, [](AsyncWebServerRequest *request){
    String json = getSensorReadings();
    request->send(200, "application/json", json);
    json = String();
  });

  events.onConnect([](AsyncEventSourceClient *client){
    if(client->lastId()){
      Serial.printf("Client reconnected! Last message ID that it got is: %u\n", client->lastId());
    }
    // send event with message "hello!", id current millis
    // and set reconnect delay to 1 second
    client->send("hello!", NULL, millis(), 10000);
  });
  server.addHandler(&events);

  // Start server
  server.begin();

  // SSR
  pinMode(SSRPin, OUTPUT);

  // MAX6675 stabilize
  delay(500);
}

void loop() 
{
  if ((millis() - lastTime) > timerDelay) {
    // Send Events to the client with the Sensor Readings Every 1 seconds
    events.send("ping",NULL,millis());
    events.send(getSensorReadings().c_str(),"new_readings" ,millis());
    lastTime = millis();
  }

  // DEBUG
  Serial.print("Status: ");

  if(status == statusTypes::started)
    Serial.println("Started!");    
  else
    Serial.println("Stopped");   

  // Thermocouple read Temp
  tc.read();

  tempIst = tc.getTemperature() * (-1);
 

  if (tempIst > tempHigh)
    tempHigh = tempIst;

  if (tempIst < tempLow)
    tempLow = tempIst;  
  

  // DEBUG
  Serial.print("Temp: ");
  Serial.print(tempIst);
  Serial.print("°C / ");
  Serial.print(tempSoll);
  Serial.println("°C");

  Serial.print("Lowest: ");
  Serial.print(tempLow);
  Serial.println("°C");
  Serial.print("Highest: ");
  Serial.print(tempHigh);
  Serial.println("°C");



  // Heating Controller
  if (status == statusTypes::started)
  {
    if (tempIst < (tempSoll - tempHist))
    {
      digitalWrite(SSRPin, HIGH);
    } 

    if (tempIst > (tempSoll + tempHist)) 
    {
      digitalWrite(SSRPin, LOW);
    }    
  }
  else
  {
    // Switch off Heater for safety
    digitalWrite(SSRPin, LOW);
  }

  // DEBUG
  Serial.print("Heater: ");
  Serial.println(digitalRead(SSRPin));


  Serial.println();
  // Delay for MAX6675
  delay(1000);
}
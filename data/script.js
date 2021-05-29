var gateway = `ws://${window.location.hostname}/ws`;

var websocket;

window.addEventListener('load', onload);
// Create Temperature Chart
var chartT = new Highcharts.Chart({
  chart:{
    renderTo:'chart-temperature'
  },
  series: [
    {
      name: 'Ist-Temperatur',
      type: 'line',
      color: '#101D42',
      marker: {
        symbol: 'circle',
        radius: 3,
        fillColor: '#101D42',
      }
    },
    {
      name: 'Soll-Temperatur',
      type: 'line',
      color: '#00A6A6',
      marker: {
        symbol: 'square',
        radius: 3,
        fillColor: '#00A6A6',
      }
    },
  ],
  plotOptions: 
  {
    line: {
    dataLabels: { enabled: true },
    enableMouseTracking: false
    }
    
  },
  title: {
    text: undefined
  },

  yAxis: {
    title: {
      text: 'Temperatur'
    }
  },
  credits: {
    enabled: false
  }
});
// Chart Entry #
var x = 0;

function onload(event) 
{
    initWebSocket();
}

function getValues()
{
    websocket.send("getValues");
}

function initWebSocket() 
{
    console.log('Trying to open a WebSocket connection…');
    websocket = new WebSocket(gateway);
    websocket.onopen = onOpen;
    websocket.onclose = onClose;
    websocket.onmessage = onMessage;
}

function onOpen(event) 
{
    console.log('Connection opened');
    getValues();
}

function onClose(event) 
{
    console.log('Connection closed');
    setTimeout(initWebSocket, 2000);
}

function sendRequest(message) 
{
    console.log(message);
    websocket.send(message);
}

function onMessage(event) 
{
  console.log(event.data);
  var myObj = JSON.parse(event.data);
  var keys = Object.keys(myObj);
  console.log(myObj);

  parseMessage(myObj);
}

function parseMessage(jsonValue) 
{
  var keys = Object.keys(jsonValue);

  for (var i = 0; i <= 1; i++)
  {
    x += 1; //(new Date()).getTime();
    const key = keys[i];

    var y = Number(jsonValue[key]);

    // Plot values in Chart
    if(chartT.series[i].data.length > 400) 
      chartT.series[i].addPoint([x, y], true, true, true);
    else 
      chartT.series[i].addPoint([x, y], true, false, true);
    
  }

  // Status Messages
  if (jsonValue[keys[2]] == 'started') 
    document.getElementById("status").innerHTML = '<img src="img/accept.png" alt="started">';
  else
    document.getElementById("status").innerHTML = '<img src="img/cancel.png" alt="started">';
  
  document.getElementById("reflow-state").innerHTML = jsonValue[keys[3]];

}


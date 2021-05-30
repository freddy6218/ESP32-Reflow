var gateway = `ws://${window.location.hostname}/ws`;

var websocket;

window.addEventListener('load', onload);

// Create Temperature Chart
var chartT = new Highcharts.Chart({
  chart: {
    renderTo: 'chart-temperature'
  },
  series: [{
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
  plotOptions: {
    line: {
      dataLabels: {
        enabled: false
      },
      states: {
        hover: {
          lineWidth: 5
        }
      },
      enableMouseTracking: true
    }

  },
  title: {
    text: undefined
  },
  xAxis: {
    type: 'datetime',
    dateTimeLabelFormats: {
      second: '%H:%M:%S'
    }
  },
  yAxis: {
    title: {
      text: 'Temperatur'
    },
    minorGridLineWidth: 0,
    gridLineWidth: 0,
    alternateGridColor: null,
    plotBands: [{ // Preheating Zone
        from: 0,
        to: 150,
        color: 'rgba(68, 170, 213, 0.1)',
        label: {
          text: 'Pre-Heating Zone',
          style: {
            color: '#606060'
          }
        }
      },
      { // Soaking Zone
        from: 150,
        to: 183,
        color: 'rgba(0, 0, 0, 0)',
        label: {
          text: 'Soaking Zone',
          style: {
            color: '#606060'
          }
        }
      },
      { // Reflow Zone
        from: 183,
        to: 225,
        color: 'rgba(68, 170, 213, 0.1)',
        label: {
          text: 'Reflow Zone',
          style: {
            color: '#606060'
          }
        }
      }
    ]
  },
  credits: {
    enabled: false
  }
});

function onload(event) {
  initWebSocket();
}

function getValues() {
  websocket.send("getValues");
}

function initWebSocket() {
  console.log('Trying to open a WebSocket connection…');
  websocket = new WebSocket(gateway);
  websocket.onopen = onOpen;
  websocket.onclose = onClose;
  websocket.onmessage = onMessage;
}

function onOpen(event) {
  console.log('Connection opened');
  getValues();
}

function onClose(event) {
  console.log('Connection closed');
  setTimeout(initWebSocket, 2000);
}

function sendRequest(message) {
  console.log(message);
  websocket.send(message);
}


function onMessage(event) {
  var myObj = JSON.parse(event.data);
  console.log(myObj);

  parseMessage(myObj);
}

function parseMessage(jsonValue) {
  var keys = Object.keys(jsonValue);

  for (var i = 0; i <= 1; i++) {
    var x = (new Date()).getTime();
    const key = keys[i];

    var y = Number(jsonValue[key]);

    // Plot values in Chart
    if (chartT.series[i].data.length > 400)
      chartT.series[i].addPoint([x, y], true, true, true);
    else
      chartT.series[i].addPoint([x, y], true, false, true);

  }


  // Status Messages
  document.getElementById("tempIst").innerHTML = jsonValue[keys[0]] + '°C';
  document.getElementById("tempSoll").innerHTML = jsonValue[keys[1]] + '°C';

  if (jsonValue[keys[2]] == 'started')
    document.getElementById("status").innerHTML = '<img src="img/accept.png" alt="started">';
  else
    document.getElementById("status").innerHTML = '<img src="img/cancel.png" alt="started">';

  // Reflow-Phase
  document.getElementById("reflow-state").innerHTML = jsonValue[keys[3]];

  // Bleifrei
  if (jsonValue[keys[4]] == '0') {
    document.getElementById("profile").innerHTML = 'Sn99 Ag0,3 Cu0,7';
    chartT.plotBands[0].to = 15;
  }

  // Verbleit
  if (jsonValue[keys[4]] == '1') {
    document.getElementById("profile").innerHTML = 'Sn63 Pb37';
    chartT.plotBands(0).to = 5;
  }

}
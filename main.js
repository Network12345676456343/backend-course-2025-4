const http = require("http");          
const fs = require("fs");              
const { Command } = require("commander"); 
const { XMLBuilder } = require("fast-xml-parser"); 

const program = new Command();
program
  .requiredOption("-i, --input <path>", "шлях до JSON файлу")
  .requiredOption("-h, --host <host>", "адреса сервера")
  .requiredOption("-p, --port <port>", "порт сервера");

program.parse(process.argv);
const options = program.opts();

const filePath = options.input;
const host = options.host;
const port = parseInt(options.port);

if (!fs.existsSync(filePath)) {
  console.error("Cannot find input file");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${host}:${port}`);
  const minRainfall = parseFloat(url.searchParams.get("min_rainfall"));
  const showHumidity = url.searchParams.get("humidity") === "true";

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Помилка при читанні файлу");
      return;
    }

    let weather;
    try {
      weather = JSON.parse(data);
    } catch {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Некоректний JSON");
      return;
    }

    let result = [];
    for (let i = 0; i < weather.length; i++) {
      let record = weather[i];

      if (!isNaN(minRainfall) && record.Rainfall <= minRainfall) {
        continue;
      }

      let rec = {
        rainfall: record.Rainfall,
        pressure3pm: record.Pressure3pm
      };

      if (showHumidity) {
        rec.humidity = record.Humidity3pm;
      }

      result.push(rec);
    }

    const builder = new XMLBuilder({ format: true });
    const xmlObj = { weather_data: { record: result } };
    const xmlData = builder.build(xmlObj);

    res.writeHead(200, { "Content-Type": "application/xml" });
    res.end(xmlData);

    fs.writeFile("output.xml", xmlData, (err) => {
      if (err) console.log("Помилка при записі XML");
    });
  });
});

server.listen(port, host, () => {
  console.log(`Сервер запущено: http://${host}:${port}`);
});
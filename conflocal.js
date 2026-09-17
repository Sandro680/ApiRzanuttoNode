const os = require("os");
const path = require("path");
const ini = require("ini");
const fs = require("fs");

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name in interfaces) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        const ip = iface.address;
        if (
          ip.startsWith("192.168.") || 
          ip.startsWith("10.") ||      
          /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) 
        ) {
          return ip;
        }
      }
    }
  }
  return "127.0.0.1"; // Fallback seguro caso não ache IP de rede
}

function getServerPath() {
    // Se estiver rodando dentro do PKG, pega a pasta externa do executável
    if (process.pkg) {
        return path.dirname(process.execPath).replace(/\\/g, "/");
    }
    // Se estiver em desenvolvimento, pega a pasta do projeto
    return __dirname.replace(/\\/g, "/");
} 

function leini(file = "ini.ini") {
  try {
    // Busca o ini sempre na pasta física onde o executável/servidor está rodando
    const iniPath = path.join(getServerPath(), file);
    if (fs.existsSync(iniPath)) {
      return ini.parse(fs.readFileSync(iniPath, "utf-8"));
    } else {
      return {};
    }
  } catch (err) {
    console.error("Erro ao ler ini.ini:", err);
    return {};
  }
}

function getConfig(key) {
  const config = leini();
  return config.database ? config.database[key] : "";
}

module.exports = { 
  getLocalIP, 
  getServerPath,
  getConfig 
}

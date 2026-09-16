const fs = require("node:fs");
const path = require("node:path");

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
  }

  load() {
    if (!fs.existsSync(this.filePath)) return {};
    return JSON.parse(fs.readFileSync(this.filePath, "utf8"));
  }

  save(value) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
      fs.renameSync(temporaryPath, this.filePath);
    } catch (error) {
      if (fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
      throw error;
    }
  }
}

module.exports = { JsonStore };

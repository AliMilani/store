const fs = require("fs");
const crypto = require("crypto");

class Store {
  storePathFile = "store.fsp";
  fileHashStorePath = "fileStore/";
  chunkSize = 100;
  constructor() {
    if (!fs.existsSync(this.fileHashStorePath))
      fs.mkdirSync(this.fileHashStorePath);
    if (!fs.existsSync(this.storePathFile))
      fs.writeFileSync(this.storePathFile, "[]");
    this.store = this.#loadStore();
  }

  #loadStore() {
    const store = fs.readFileSync(this.storePathFile);
    const storeMap = new Map();

    const storeArray = JSON.parse(store.toString()); //undefined:1
    storeArray.forEach(([key, value]) => {
      storeMap.set(key, Buffer.from(value.data));
    });
    // console.log(storeMap)

    console.log("initial store size :", storeMap.size);

    return storeMap;
  }

  addFile(filePath) {
    const storeSizeBeforeAdd = this.store.size;
    const file = fs.readFileSync(filePath);
    const fileHash = this.#getHash(file);
    if (this.#fileIsStored(fileHash)) return fileHash;
    const fileHashesInOrder = [];
    const totalChunks = Math.ceil(file.length / this.chunkSize);
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = start + this.chunkSize;
      const chunkData = file.slice(start, end);
      const chunkHash = this.#getHash(chunkData)
      fileHashesInOrder.push(chunkHash);
      this.store.set(chunkHash, chunkData);
    }
    console.log("total chunks", totalChunks);
    const totalAdedToStore = this.store.size - storeSizeBeforeAdd;
    console.log("total duplicate chunks", totalChunks - totalAdedToStore);
    const fileHashesInOrderString = fileHashesInOrder.join("\n");
    fs.writeFileSync(
      this.fileHashStorePath + fileHash + ".fhsp",
      fileHashesInOrderString
    );
    // this.saveStore();
    return fileHash;
  }

  #getHash(data) {
    return crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");
  }

  #fileIsStored(hash) {
    const filePath = `${this.fileHashStorePath}${hash}.fhsp`;
    return fs.existsSync(filePath);
  }

  saveStore() {
    console.log("save store size : ", this.store.size);
    fs.writeFileSync(this.storePathFile, JSON.stringify([...this.store]));
  }

  getFile(fileHash) {
    if (!this.#fileIsStored(fileHash)) throw new Error("file not found");
    const fileHashesInOrder = fs.readFileSync(
      this.fileHashStorePath + fileHash + ".fhsp"
    );
    const fileHashesInOrderArray = fileHashesInOrder.toString().split("\n");
    const fileBuffers = [];
    fileHashesInOrderArray.forEach((hash) => {
      const buffer = this.store.get(hash);
      if (!buffer) throw new Error("hash not found in store");
      fileBuffers.push(buffer);
    }); 
    return Buffer.concat(fileBuffers);
  }

  restoreFile(fileHash, destinationPath) {
    // timer start
    console.time("restoreFile");
    const file = this.getFile(fileHash);
    // timer end
    console.timeEnd("restoreFile");
    console.log("file size", file.length);
    console.log(destinationPath);
    fs.writeFileSync(destinationPath, file);
  }
}

const store = new Store();

store.addFile("resume.pdf");
store.addFile("Untitled.pdf");
store.addFile("ddd.mp4");
store.addFile("gbc.mp4");
// store.addFile("long.mp4");
// store.saveStore();
// store.restoreFile("65e4344893dc1ed97ca38bec1aca0a66ba7f3aaa9543ea57ba2d43aad80dcb4e","retored.pdf")
// store.restoreFile("42f0b6b8e95df252fd5fa7b1b7b9f6a7443530f20f22e4e269106dc1c4192ce2","video.mp4")
store.restoreFile(
  "5d8b1ccf1f41652ebc33fbb0b6e99799c53ac02461e22497d57e1dfa795c5851",
  "longVideo.mp4"
);

// const fileOne = fs.readFileSync('video.mp4');
// const fileTwo = fs.readFileSync('ddd.mp4');
// console.log(fileOne.equals(fileTwo))

import fs from "fs";
import crypto from "crypto";

type Base64 = string;
type DBFileRecord = [string, Base64];
type StoreDBMap = Map<string, Buffer>;

class Store {
  private storeDB: StoreDBMap = new Map();

  constructor(
    private chunkSize: number = 100,
    private storeDBPath: string = "store.fsp",
    private storedFilesDir: string = "fileStore/"
  ) {
    if (!fs.existsSync(this.storeDBPath))
      fs.writeFileSync(this.storeDBPath, "[]");
    if (!fs.existsSync(this.storedFilesDir)) fs.mkdirSync(this.storedFilesDir);
    this._loadStoreDBFromFile();
  }

  private _loadStoreDBFromFile() {
    const storeRecords = this._readStoreDBFile()
    storeRecords.forEach(([hash, chunk]) => {
      this.storeDB.set(hash, this._decodeBase64(chunk));
    });
  }
  
  private _readStoreDBFile(): DBFileRecord[] {
    const stroeFileBuffer  = fs.readFileSync(this.storeDBPath);
    const storeRecords: DBFileRecord[] = JSON.parse(stroeFileBuffer.toString());
    return storeRecords
  }

  private _decodeBase64(base64: Base64): Buffer {
    return Buffer.from(base64, "base64");
  }

  public insterFile(path: string): string {
    const fileBuffer = fs.readFileSync(path);
    const hash = this._hashFile(fileBuffer);
    if (this._fileIsAlreadyStored(hash)) {
      console.log(`File ${hash} already exist`)
      return hash;
    }
    const fileChunks = this._createChunks(fileBuffer);
    const fileHashes: string[] = [];
    let totalDuplicateChunks: number = 0;
    fileChunks.forEach((chunk) => {
      const chunkHash = this._hashFile(chunk);
      if (this._isAlreadyStoredInDB(chunkHash)) {
        totalDuplicateChunks += 1;
      fileHashes.push(chunkHash);
        return;
      }
      this.storeDB.set(chunkHash, chunk);
      fileHashes.push(chunkHash);
    });
    console.log("File hash: ", hash);
    console.log("Total chunks: ", fileChunks.length);
    console.log("Total unique chunks: ", fileHashes.length);
    console.log("Total duplicate chunks: ", totalDuplicateChunks);
    this._saveFileHashes(hash, fileHashes);
    console.log("File saved successfully");
    return hash;
  }

  private _fileIsAlreadyStored(hash: string): boolean {
    const filePath: string = this.storedFilesDir + hash + ".fsp";
    return fs.existsSync(filePath);
  }

  private _hashFile(fileBuffer: Buffer): string {
    const hash = crypto.createHash("sha256");
    hash.update(fileBuffer);
    return hash.digest("hex");
  }

  private _isAlreadyStoredInDB(hash: string): boolean {
    return this.storeDB.has(hash) ?? false;
  }

  private _createChunks(fileBuffer: Buffer): Buffer[] {
    const totalChunks = Math.ceil(fileBuffer.length / this.chunkSize);
    const chunks: Buffer[] = [];
    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = start + this.chunkSize;
      const chunk = fileBuffer.slice(start, end);
      chunks.push(chunk);
    }
    return chunks;
  }

  private _encodeBase64(fileBuffer: Buffer): Base64 {
    return fileBuffer.toString("base64");
  }

  private _saveFileHashes(fileHash: string, fileHashes: string[]): void {
    const filePath: string = this.storedFilesDir + fileHash + ".fsp";
    fs.writeFileSync(filePath, fileHashes.join("\n"))
  }

  public saveStoreDB(): void {
    let dbFileRecords: DBFileRecord[] = []
    console.log("Saving store DB, size: ", this.storeDB.size)
    this.storeDB.forEach((chunk, hash) => {
      dbFileRecords.push(this._createFileRecord(hash, chunk));
    })
    fs.writeFileSync(this.storeDBPath, JSON.stringify(dbFileRecords));
    console.log("Store DB saved successfully")
  }
  
  private _createFileRecord(hash: string, fileBuffer: Buffer): DBFileRecord {
    const base64 = this._encodeBase64(fileBuffer);
    return [hash, base64];
  }

  public getFile(hash: string): Buffer {
    const fileHashes: string[] = this._loadFileHashes(hash) 
    let fileBuffer: Buffer = Buffer.concat(fileHashes.map((hash: string): Buffer => {
      const chunkBuffer = this.storeDB.get(hash)
      if (chunkBuffer instanceof Buffer)
        return chunkBuffer
      
      throw new Error(`Chunk hash ${hash} not found`)
    }))
    return fileBuffer
  }

  _loadFileHashes(fileHash: string): string[]{
    const filePath: string = this.storedFilesDir + fileHash + ".fsp";
    const file = fs.readFileSync(filePath).toString()
    return file.split("\n")
  }
}

const store = new Store();
const fileHash = store.insterFile("video.mp4");
store.saveStoreDB()
fs.writeFileSync('file.mp4',store.getFile(fileHash))

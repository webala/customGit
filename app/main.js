/** @format */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

/**
 * Initializes a new Git repository in the current working directory.
 * Creates the basic Git directory structure:
 * - .customGit/           Main Git directory
 * - .customGit/objects/   Storage for all Git objects (blobs, trees, commits)
 * - .customGit/refs/      Storage for references (branches, tags)
 *
 * Also creates the initial HEAD file pointing to the main branch.
 */

function initRepository() {
   const gitPath = path.join(process.cwd(), ".customGit");
   if (fs.existsSync(gitPath)) {
      console.error("Repository already exists");
      process.exit(1);
   }
   console.log("Initializing repository...");
   fs.mkdirSync(path.join(process.cwd(), ".customGit"), { recursive: true });
   fs.mkdirSync(path.join(process.cwd(), ".customGit", "objects"), {
      recursive: true,
   });
   fs.mkdirSync(path.join(process.cwd(), ".customGit", "refs"), {
      recursive: true,
   });

   fs.writeFileSync(
      path.join(process.cwd(), ".customGit", "HEAD"),
      "ref: refs/heads/main\n"
   );
   console.log("Repository initialized successfully.");
}

function createShaHash(uncompressedData) {
   const hash = crypto.createHash("sha1").update(uncompressedData);
   const hashDigest = hash.digest("hex");
   return [hash, hashDigest];
}

function getGitMode(stats) {
   if (stats.isDirectory()) return "40000";
   if (stats.isSymbolicLink()) return "120000";
   return stats.mode & 0o100 ? "100755" : "100644"; // Check if executable
}

// Function to stage a file
function stageFile(file) {
   if (fs.existsSync(file)) {
      const dest = path.join(STAGING_DIR, path.basename(file));
      fs.copyFileSync(file, dest);
      console.log(`Staged ${file}`);
   } else {
      console.log(`File ${file} does not exist.`);
   }
}

async function writeObject(hash, buffer) {
   const objectDir = path.join(
      process.cwd(),
      ".customGit",
      "objects",
      hash.slice(0, 2)
   );
   fs.mkdirSync(objectDir, { recursive: true });
   const objectPath = path.join(objectDir, hash.slice(2));
   fs.writeFileSync(objectPath, buffer);
   return hash;
}

async function stageTreeObject(hash, buffer) {
   const objectDir = path.join(
      process.cwd(),
      ".customGit",
      "staging",
      hash.slice(0, 2)
   );
   fs.mkdirSync(objectDir, { recursive: true });
   const objectPath = path.join(objectDir, hash.slice(2));
   fs.writeFileSync(objectPath, buffer);
   return hash;
}

async function writeBlobObject(filePath) {
   const fileData = fs.readFileSync(filePath);

   if (!fileData) {
      process.stderr.write("File not found");
      return null;
   }
   const uncompressedBlob = `blob ${fileData.length}\x00${fileData}`;

   const [hash, hashHex] = createShaHash(uncompressedBlob);

   // Convert callback-based zlib.deflate to Promise
   const buffer = await new Promise((resolve, reject) => {
      zlib.deflate(uncompressedBlob, (err, buffer) => {
         if (err) {
            reject(err);
         } else {
            resolve(buffer);
         }
      });
   });

   return writeObject(hashHex, buffer);
}

async function writeTreeObject(directory) {
   const files = fs.readdirSync(directory);

   let treeEntries = ""; // Changed from const to let

   // Use Promise.all to handle multiple async operations
   await Promise.all(
      files.map(async (file) => {
         if (file !== ".customGit" && file !== ".git") {
            const currentPath = path.join(directory, file);
            const stats = fs.statSync(currentPath);
            let entry;

            if (stats.isDirectory()) {
               const mode = getGitMode(stats);
               const directoryName = path.basename(currentPath);
               const treeHash = await writeTreeObject(currentPath); // await here
               entry = `${mode} ${directoryName}\0${treeHash}`;
            } else if (stats.isFile()) {
               const fileHash = await writeBlobObject(currentPath); // await here
               const mode = getGitMode(stats);
               const fileName = path.basename(currentPath);
               entry = `${mode} ${fileName}\0${fileHash}`;
            }

            if (entry) {
               treeEntries += entry;
            }
         }
      })
   );

   const treeHeader = `tree ${treeEntries.length}\x00`;
   const treeObject = treeHeader + treeEntries;
   const [_, hashHex] = createShaHash(treeObject);

   const compressed = await zlib.deflateSync(treeObject);
   return stageTreeObject(hashHex, compressed);
}

async function readTreeObject(hash, staged = false) {
   const file = await fs.readFileSync(
      path.join(
         process.cwd(),
         ".customGit",
         staged ? "staging" : "objects",
         hash.slice(0, 2),
         hash.slice(2)
      )
   );
   const uncompressed = zlib.inflateSync(file);
   const entries = uncompressed.toString().split("\x00");
   entries.shift();
   // entries.shift();
   entries.pop();
   entries.forEach((entry) => {
      const [_, fileName] = entry.split(" ");
      console.log(`${fileName} \n`);
   });
   // return entries;
}


// Function to list staged files
function listStagedFiles() {
   console.log("Staged files:");
   const files = fs.readdirSync(STAGING_DIR);
   files.forEach((file) => console.log(file));
}

// Function to commit staged files
function commitStagedFiles() {
   console.log("Committing staged files...");
   // Here you would implement the logic to move files from the staging area to a "committed" state
   // For simplicity, we'll just list them
   listStagedFiles();
}

async function stageWorkingTree() {
   console.log("Staging working tree...");
   const treeHash = await writeTreeObject(process.cwd());
   await readTreeObject(treeHash, true);
   // compare it with the latest working tree once we implement the commit command
   console.log("Working tree staged: ", treeHash);
}

async function compareTreeObjects(hash1, hash2, staged = false) {
    // Helper function to parse tree object into a map
    async function parseTreeObject(hash) {
        const file = await fs.readFileSync(
            path.join(
                process.cwd(),
                ".customGit",
                staged ? "staging" : "objects",
                hash.slice(0, 2),
                hash.slice(2)
            )
        );
        const uncompressed = zlib.inflateSync(file);
        const entries = uncompressed.toString().split("\x00");
        entries.shift(); // Remove header
        entries.pop();   // Remove empty entry

        // Create a map of filename to [mode, hash]
        const fileMap = new Map();
        entries.forEach(entry => {
            const [mode, fileName] = entry.split(" ");
            fileMap.set(fileName, mode);
        });
        return fileMap;
    }

    // Parse both trees
    const tree1 = await parseTreeObject(hash1);
    const tree2 = await parseTreeObject(hash2);

    // Compare the trees
    const allFiles = new Set([...tree1.keys(), ...tree2.keys()]);
    
    for (const file of allFiles) {
        if (!tree1.has(file)) {
            console.log(`+ ${file} (added)`);
        } else if (!tree2.has(file)) {
            console.log(`- ${file} (deleted)`);
        } else if (tree1.get(file) !== tree2.get(file)) {
            console.log(`M ${file} (modified)`);
        }
    }
}

const command = process.argv[2];

switch (command) {
   case "hello":
      console.log("Hello, world!");
      break;
   case "init":
      initRepository();
      break;
   case "stage":
      stageWorkingTree();
      break;
   //   case "list":
   //     listStagedFiles();
   //     break;
   case "commit":
      commitStagedFiles();
      break;
   case "diff":
      const hash1 = process.argv[3];
      const hash2 = process.argv[4];
      if (!hash1 || !hash2) {
         console.error("Please provide two tree hashes to compare");
         process.exit(1);
      }
      compareTreeObjects(hash1, hash2, true);
      break;
   default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
}

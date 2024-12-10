/** @format */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const zlib = require("zlib");

const STAGING_DIR = path.join(process.cwd(), ".customGit", "staging");
const OBJECTS_DIR = path.join(process.cwd(), ".customGit", "objects");

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
   
   // Create basic directory structure
   fs.mkdirSync(path.join(process.cwd(), ".customGit"), { recursive: true });
   fs.mkdirSync(path.join(process.cwd(), ".customGit", "objects"), {
      recursive: true,
   });
   fs.mkdirSync(path.join(process.cwd(), ".customGit", "refs"), {
      recursive: true,
   });
   fs.mkdirSync(path.join(process.cwd(), ".customGit", "staging"), {
      recursive: true,
   });
   fs.mkdirSync(path.join(process.cwd(), ".customGit", "refs", "heads"), {
      recursive: true,
   });

   // Create .customIgnore file
   const ignoreContent = ".customGit\n.git\n";
   fs.writeFileSync(path.join(process.cwd(), ".customIgnore"), ignoreContent);

   // Create an empty tree for the initial commit
   const emptyTree = "tree 0\0";
   const [_, emptyTreeHash] = createShaHash(emptyTree);
   const compressed = zlib.deflateSync(emptyTree);
   writeObject(emptyTreeHash, compressed);

   // Create the initial commit
   const initialCommitMessage = "Initial commit";
   const commitObject = `tree ${emptyTreeHash}\n\n${initialCommitMessage}\n`;
   const [__, initialCommitHash] = createShaHash(commitObject);
   const compressedCommit = zlib.deflateSync(commitObject);
   writeObject(initialCommitHash, compressedCommit);

   // Create the main branch pointing to the initial commit
   const mainBranchPath = path.join(process.cwd(), ".customGit", "refs", "heads", "main");
   fs.writeFileSync(mainBranchPath, initialCommitHash + "\n");

   // Set HEAD to point to main branch
   fs.writeFileSync(
      path.join(process.cwd(), ".customGit", "HEAD"),
      "ref: refs/heads/main\n"
   );
   
   console.log("Repository initialized successfully.");
}

// Create a SHA-1 hash of the given data
// Returns an array with the hash and the hash in hex
function createShaHash(uncompressedData) {
   const hash = crypto.createHash("sha1").update(uncompressedData);
   const hashDigest = hash.digest("hex");
   return [hash, hashDigest];
}

// Get the Git mode of a file or directory
// Returns the mode in the format of a string
function getGitMode(stats) {
   if (stats.isDirectory()) return "40000";
   if (stats.isSymbolicLink()) return "120000";
   return stats.mode & 0o100 ? "100755" : "100644"; // Check if executable
}


// Write an object to the objects directory
// Returns the hash of the object
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


/**
 * Stage a tree object
 * Writes the tree object to the staging directory
 * Returns the hash of the object
 */
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


/**
 * Create a blob object and write it to the objects directory
 * Blob objects are the basic unit of storage in Git
 * They store the contents of a file
 * Returns the hash of the object
 */
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

// Add new function to read ignore patterns
function getIgnoredPatterns() {
   const ignorePath = path.join(process.cwd(), ".customIgnore");
   if (fs.existsSync(ignorePath)) {
      const content = fs.readFileSync(ignorePath, 'utf8');
      return content.split('\n').filter(line => line.trim() !== '');
   }
   return ['.customGit', '.git']; // Default patterns if file doesn't exist
}

// Add new function to check if path should be ignored
function shouldIgnore(filePath) {
   const patterns = getIgnoredPatterns();
   const relativePath = path.relative(process.cwd(), filePath);
   return patterns.some(pattern => {
      // Match exact file/directory names or paths starting with the pattern
      return relativePath === pattern || 
             relativePath.startsWith(pattern + path.sep);
   });
}

/**
 * Create a tree object and write it to the staging directory
 * The tree is later moved to the objects directory with the commit command
 * Tree objects are used to store the contents of a directory
 * Returns the hash of the object
 */   
async function writeTreeObject(directory) {
   const files = fs.readdirSync(directory);
   let treeEntries = "";

   // Use Promise.all to handle multiple async operations
   await Promise.all(
      files.map(async (file) => {
         const currentPath = path.join(directory, file);
         
         // Skip if file/directory should be ignored
         if (shouldIgnore(currentPath)) {
            return;
         }

         const stats = fs.statSync(currentPath);
         let entry;

         if (stats.isDirectory()) {
            const mode = getGitMode(stats);
            const directoryName = path.basename(currentPath);
            const treeHash = await writeTreeObject(currentPath);
            entry = `${mode} ${directoryName}\0${treeHash}`;
         } else if (stats.isFile()) {
            const fileHash = await writeBlobObject(currentPath);
            const mode = getGitMode(stats);
            const fileName = path.basename(currentPath);
            entry = `${mode} ${fileName}\0${fileHash}`;
         }

         if (entry) {
            treeEntries += entry;
         }
      })
   );

   const treeHeader = `tree ${treeEntries.length}\x00`;
   const treeObject = treeHeader + treeEntries;
   const [_, hashHex] = createShaHash(treeObject);

   const compressed = await zlib.deflateSync(treeObject);
   return stageTreeObject(hashHex, compressed);
}


/**
 * Create a commit object and write it to the objects directory
 * Commit objects are used to store the state of the repository
 * Returns the hash of the object
 */
async function writeCommitObject(treeHash, parentHash, commitMessage) {
    // Construct the commit object
    let commitObject = `tree ${treeHash}\n`;
    if (parentHash) {
        commitObject += `parent ${parentHash}\n`;
    }
    commitObject += `\n${commitMessage}\n`;

    // Create a SHA-1 hash of the commit object
    const [_, hashHex] = createShaHash(commitObject);

    // Compress the commit object
    const compressed = zlib.deflateSync(commitObject);

    // Write the commit object to the objects directory
    return writeObject(hashHex, compressed);
}

/**
 * Read a tree object from the objects directory
 * Logs the filenames in the tree object
 */
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

/**
 * Move directories recursively
 * Overwrites files if they already exist
 */
function moveDirectory(source, destination) {
    // Create destination directory if it doesn't exist
    if (!fs.existsSync(destination)) {
        fs.mkdirSync(destination, { recursive: true });
    }

    // Read all files in source directory
    const files = fs.readdirSync(source);

    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);

        if (fs.statSync(sourcePath).isDirectory()) {
            // Recursively move subdirectories
            moveDirectory(sourcePath, destPath);
            fs.rmdirSync(sourcePath);
        } else {
            // Move files, overwriting if they exist
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            fs.renameSync(sourcePath, destPath);
        }
    });
}

/**
 * Commit staged files
 * Moves files from the staging directory to the objects directory
 * Creates a new commit object
 * Updates the HEAD reference to point to the new commit
 */
async function commitStagedFiles(commitMessage) {
    console.log("Committing staged changes...");

    // Read all files from staging directory
    const files = fs.readdirSync(STAGING_DIR);

    if (!files) {
        console.error("No files to commit");
        return;
    }
    if (files.length === 0) {
        console.error("No files to commit");
        return;
    }

    // Move each file to objects directory while preserving subdirectories
    files.forEach((file) => {
        const sourcePath = path.join(STAGING_DIR, file);
        const destPath = path.join(OBJECTS_DIR, file);

        if (fs.statSync(sourcePath).isDirectory()) {
            moveDirectory(sourcePath, destPath);
            fs.rmdirSync(sourcePath);
        } else {
            // For regular files
            const destDir = path.dirname(destPath);
            fs.mkdirSync(destDir, { recursive: true });
            
            if (fs.existsSync(destPath)) {
                fs.unlinkSync(destPath);
            }
            fs.renameSync(sourcePath, destPath);
        }
    });

    // Create a new commit object
    const head = getHeadReference();
    const treeHash = await writeTreeObject(process.cwd());

    // Remove the staging directory
    fs.rmSync(STAGING_DIR, { recursive: true, force: true });
    // Recreate empty staging directory
    fs.mkdirSync(STAGING_DIR, { recursive: true });

    const commitHash = await writeCommitObject(
        treeHash,
        head.type === "commit" ? head.hash : null,
        commitMessage
    );
    updateHeadToCommit(commitHash);
    console.log(`Commit created with hash: ${commitHash}`);
}

/**
 * Stage the working tree
 * Creates a tree object and writes it to the staging directory
 * Logs the filenames in the tree object
 */
async function stageWorkingTree() {
   console.log("Staging working tree...");
   const treeHash = await writeTreeObject(process.cwd());
   await readTreeObject(treeHash, true);
   //TODO: compare it with the latest working tree once we implement the commit command
   console.log("Working tree staged: ", treeHash);
}

/**
 * Compare two tree objects
 * Logs the differences between the two trees
 */
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

/**
 * Get the latest commit hash
 * Returns the hash of the latest commit
 */
function getHeadReference() {
    const headPath = path.join(process.cwd(), ".customGit", "HEAD");
    const headContent = fs.readFileSync(headPath, "utf-8").trim();

    if (headContent.startsWith("ref:")) {
        // Branch reference
        const branchRef = headContent.split(" ")[1];
        return { type: "branch", ref: branchRef };
    } else {
        // Detached HEAD
        return { type: "commit", hash: headContent };
    }
}

/**
 * Update the HEAD reference to point to a branch
 * Updates the HEAD file with the branch name
 */
function updateHeadToBranch(branchName) {
    const headPath = path.join(process.cwd(), ".customGit", "HEAD");
    fs.writeFileSync(headPath, `ref: refs/heads/${branchName}\n`);
}

/**
 * Update the HEAD reference to point to a commit
 * Updates the HEAD file with the commit hash
 */
function updateHeadToCommit(commitHash) {
    const headPath = path.join(process.cwd(), ".customGit", "HEAD");
    fs.writeFileSync(headPath, `${commitHash}\n`);
}

/**
 * Checkout a branch
 * Updates the HEAD reference to point to the branch
 * Logs the branch name
 */
function checkoutBranch(branchName) {
    // Logic to switch to the branch
    updateHeadToBranch(branchName);
    console.log(`Switched to branch '${branchName}'`);
}

/**
 * Checkout a commit
 * Updates the HEAD reference to point to the commit
 * Logs the commit hash
 */
function checkoutCommit(commitHash) {
    // Logic to switch to the commit
    updateHeadToCommit(commitHash);
    console.log(`Checked out commit '${commitHash}'`);
}

/**
 * Create a branch
 * Checks if the branch already exists
 * Creates a new branch pointing to the current commit
 * Logs the branch name and commit hash
 */
function createBranch(branchName) {
    // Check if branch already exists
    const branchPath = path.join(process.cwd(), '.customGit', 'refs', 'heads', branchName);
    if (fs.existsSync(branchPath)) {
        console.error(`Branch '${branchName}' already exists`);
        return;
    }

    // Get current HEAD commit
    const head = getHeadReference();
    let commitHash;

    if (head.type === 'commit') {
        commitHash = head.hash;
    } else {
        // If HEAD points to a branch, get that branch's commit
        const branchFile = path.join(process.cwd(), '.customGit', head.ref);
        if (fs.existsSync(branchFile)) {
            // Read the commit hash that the branch points to
            commitHash = fs.readFileSync(branchFile, 'utf-8').trim();
        } else {
            console.error('Could not resolve HEAD reference');
            return;
        }
    }

    // Create the branch pointing to the current commit
    fs.mkdirSync(path.dirname(branchPath), { recursive: true });
    fs.writeFileSync(branchPath, commitHash + '\n');
    console.log(`Created branch '${branchName}' at ${commitHash}`);
}

/**
 * List all branches
 * Logs the branches and indicates the current branch
 * NOTE: One has to checkout to a branch explicitly so that its indicated in the branches list as the current branch
 */
function listBranches() {
    const branchesDir = path.join(process.cwd(), '.customGit', 'refs', 'heads');
    if (!fs.existsSync(branchesDir)) {
        console.log('No branches exist yet');
        return;
    }

    const branches = fs.readdirSync(branchesDir);
    const currentBranch = getCurrentBranch();

    branches.forEach(branch => {
        const prefix = branch === currentBranch ? '* ' : '  ';
        console.log(prefix + branch);
    });
}

/**
 * Get the current branch
 * Returns the name of the current branch
 */
function getCurrentBranch() {
    const head = getHeadReference();
    if (head.type === 'branch') {
        return head.ref.replace('refs/heads/', '');
    }
    return null; // Detached HEAD state
}

/**
 * Checkout a branch
 * Checks if the branch exists
 * Updates the HEAD reference to point to the branch
 * Logs the branch name
 */
function checkoutBranch(branchName) {
    const branchPath = path.join(process.cwd(), '.customGit', 'refs', 'heads', branchName);
    
    // Check if branch exists
    if (!fs.existsSync(branchPath)) {
        console.error(`Branch '${branchName}' does not exist`);
        return;
    }

    // Update HEAD to point to the new branch
    updateHeadToBranch(branchName);

    // Get the commit that the branch points to
    const commitHash = fs.readFileSync(branchPath, 'utf-8').trim();
    
    // Here you would typically update the working directory
    // to match the state of the commit
    // This would involve reading the tree object and updating files

    console.log(`Switched to branch '${branchName}'`);
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
   case "commit":
      const commitMessage = process.argv[3];
      commitStagedFiles(commitMessage);
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
   case "branch":
      const branchName = process.argv[3];
      if (branchName) {
          createBranch(branchName);
      } else {
          listBranches();
      }
      break;
   case "checkout":
      const target = process.argv[3];
      if (!target) {
          console.error("Please specify a branch name");
          process.exit(1);
      }
      checkoutBranch(target);
      break;
   default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
}

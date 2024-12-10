<!-- @format -->

# Project Name

## Overview

Provide a brief overview of your project here. Explain what it does and any key features.

## Requirements

-  Node.js (version 20.18.0 or later)
-  Git

## Setup

1. **Clone the Repository**

   ```bash
   git clone [repository-url](https://github.com/webala/customGit.git)
   cd customGit
   ```

2. **Make the script executable**

   For macOS/Linux:

   ```bash
   chmod +x customGit.sh
   ```

   For Windows users, you have several options:

   a. Using Git Bash:

   -  Install Git Bash if you haven't already (comes with Git for Windows)
   -  Navigate to your project directory in Git Bash
   -  Run the chmod command as above

   ```bash
   chmod +x customGit.sh
   ```

   b. Using Windows Subsystem for Linux (WSL):

   -  Install WSL if you haven't already (Instructions: https://docs.microsoft.com/en-us/windows/wsl/install)
   -  Open WSL terminal
   -  Navigate to your project directory
   -  Run the chmod command as above

   ```bash
   chmod +x customGit.sh
   ```

   c. Using Cygwin:

   -  Install Cygwin if you haven't already
   -  Open Cygwin terminal
   -  Navigate to your project directory
   -  Run the chmod command as above

   ```bash
   chmod +x customGit.sh
   ```

   Note: If you're using Windows and don't want to install any of the above tools, you can also run the script directly using bash:

   ```bash
   bash customGit.sh <command>
   ```

## Running the Project

To run the project, use the `customGit.sh` script. This script will execute the `main.js` file located in the `app` directory.

## Commands

Here are the commands that `customGit.sh` can execute:

-  **hello**: Prints "Hello, world!" to the console.

   ```bash
   ./customGit.sh hello
   ```

- **init**: Initialize a new repository in the current directory.

   ```bash
   ./customGit.sh init
   ```

   This command will create a new .customGit directory in the current directory.

   .customGit structure:

   -  .customGit
      -  HEAD
      -  staging
      -  objects
      -  refs

   HEAD:

   -  This file contains the hash of the latest commit or points to the current branch.

   staging:

   -  This directory contains the working tree of the staged files

   objects:

   -  Stores Blob objects for files, tree objects for directories, and commit objects for commits.

   refs:

   -  This directory contains the references to the commits and branches

-  **stage**: Create a tree object of the current working tree and store it in the staging directory.

   ```bash
    ./customGit.sh stage
   ```

   This command will create a tree object of the current working tree and store it in the staging directory.

   The staging directory is located in the .customGit directory.

-  **commit**: Moves the staged files from the staging directory to the objects directory and creates a commit object. Changes the HEAD reference to point to the new commit.

   ```bash
   ./customGit.sh commit <commit-message>
   ```

-  **diff**: Prints the diff between two working trees.

   ```bash
   ./customGit.sh diff <treeHash1> <treeHash2>
   ```

-  **branch**: Create a new branch.

   ```bash
   ./customGit.sh branch <branchName>
   ```

-  **checkout**: Switch to a branch.

   ```bash
   ./customGit.sh checkout <branchName>
   ```


## TODO

-  [x] Initialize repositories in a directory and the repository proper should be stored in a dot-prefixed subdirectory
-  [x] Stage files in the repository - Create a staging folder and store the working tree of the latest work in the working directory

-  [x] Commit files in the repository
-  [ ] View commit history
-  [x] Create branches
-  [x] Checkout branches
-  [ ] Merge branches
-  [x] View diff between branches - Compare the hashes of the heads of 2 branches to view the diff
-  [ ] Detect conflicts in merge
-  [ ] Clone repository on disk

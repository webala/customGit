# Project Name

## Overview

Provide a brief overview of your project here. Explain what it does and any key features.

## Requirements

- Node.js (version X.X.X or later)
- Any other dependencies or tools required

## Setup

1. **Clone the Repository**

   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. **Install Dependencies**

   If your project has dependencies, list the command to install them. For example:

   ```bash
   npm install
   ```

3. **Make the script executable**
   
   For macOS/Linux:
   ```bash
   chmod +x customGit.sh
   ```

   For Windows users, you have several options:

   a. Using Git Bash:
   - Install Git Bash if you haven't already (comes with Git for Windows)
   - Navigate to your project directory in Git Bash
   - Run the chmod command as above
   ```bash
   chmod +x customGit.sh
   ```

   b. Using Windows Subsystem for Linux (WSL):
   - Install WSL if you haven't already (Instructions: https://docs.microsoft.com/en-us/windows/wsl/install)
   - Open WSL terminal
   - Navigate to your project directory
   - Run the chmod command as above
   ```bash
   chmod +x customGit.sh
   ```

   c. Using Cygwin:
   - Install Cygwin if you haven't already
   - Open Cygwin terminal
   - Navigate to your project directory
   - Run the chmod command as above
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

- **hello**: Prints "Hello, world!" to the console.

  ```bash
  ./customGit.sh hello
  ```

- **<other-command>**: Describe any other commands your script can handle.

  ```bash
  ./customGit.sh <other-command>
  ```

## Troubleshooting

- **Common Issue 1**: Description and solution.
- **Common Issue 2**: Description and solution.


## TODO

- [x] Initialize repositories in a directory and the repository proper should be stored in a dot-prefixed subdirectory
- [x] Stage files in the repository
      - Create a staging folder and store the working tree of the latest work in the working directory

- [ ] Commit files in the repository
- [ ] View commit history
- [ ] Create branches
- [ ] Checkout branches
- [ ] Merge branches
- [x] View diff between branches
- [ ] Detect conflicts in merge
- [ ] Clone repository on disk






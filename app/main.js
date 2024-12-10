


const command = process.argv[2];

switch (command) {
  case "hello":
    console.log("Hello, world!");
    break;
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}


import readline from "readline";

export class ChatInterface {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  async getUserInput(): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question("You: ", (input) => {
        resolve(input);
      });
    });
  }

  close() {
    this.rl.close();
  }
}

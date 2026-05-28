#!/usr/bin/env tsx
import { createSftpServer } from "../src/use-cases/servers.js";
const id = await createSftpServer();
console.log(`Setup Transfer Family SFTP server ${id}`);

import cors from 'cors'
import express from 'express'
import {
  ensureLlmConfigTable,
  ensureStoryChapterTable,
  ensureStoryListTable,
} from './db/index.js'
import apiRoutes from './routes/index.js';

ensureLlmConfigTable()
ensureStoryListTable()
ensureStoryChapterTable()


const app = express()
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.use('/api', apiRoutes);


app.listen(PORT, () => {
  console.log(`API 服务已启动: http://localhost:${PORT}`)
})

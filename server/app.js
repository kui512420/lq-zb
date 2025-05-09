const express = require("express");
const cors = require("cors");
const app = express();
const port = 3001;
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const OpenAI = require("openai");

// 在服务器启动时读取system.txt
let systemPrompt = "你是ai";
try {
  systemPrompt = fs.readFileSync(path.join(__dirname, "system.txt"), "utf-8");
} catch (error) {
  console.warn('无法读取system.txt文件，使用默认提示词:', error.message);
}
app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  baseURL: process.env.DEEPSEEK_BASE_URL,
  apiKey: process.env.OPENAI_API_KEY,
});
app.post("/api/create-qrcode", express.json(), async (req, res) => {
  try {
    const response = await axios.post(
      "https://passport.lanqiao.cn/api/v1/wechat/create-scene-qrcode/",
      req.body
    );
    res.send({ data: response.data });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.get("/api/scan-mp-login", async (req, res) => {
  try {
    const scene_str = req.query.scene_str;
    const response = await axios.get(
      "https://passport.lanqiao.cn/api/v1/wechat/scan-mp-login/",
      {
        params: {
          scene_str: scene_str,
        },
      }
    );
    const headers = response.headers;
    const cookies = headers["set-cookie"];
    const lqtoken = cookies
      .find((cookie) => cookie.startsWith("lqtoken"))
      .split(";")[0]
      .split("=")[1];
    res.send({ data: response.data, lqtoken: lqtoken });
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.get("/api/user/basic", async (req, res) => {
  try {
    const lqtoken = req.query.lqtoken;

    const response = await axios.get(
      "https://www.lanqiao.cn/api/v2/user/basic/",
      {
        headers: {
          Cookie: `lqtoken=${lqtoken}`,
        },
      }
    );
    res.send({ data: response.data });
  } catch (error) {
    console.error(error);
    res.status(500).send(error.message);
  }
});

app.post('/api/ai', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), 300000)
      )
    ]);

    if (!completion || !completion.choices || !completion.choices[0]) {
      throw new Error('API返回数据格式错误');
    }

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error('AI API error:', error);
    const errorMessage = error.message === '请求超时' ? '请求超时，请稍后重试' : '服务器处理请求时出错';
    res.status(500).json({ error: errorMessage });
  }
});
app.get('/api/class-schedules', async (req, res) => {
  try {
    const { start_at, end_at, lqtoken: queryToken } = req.query;
    const lqtoken = queryToken || req.headers['lqtoken'] || req.cookies?.lqtoken;
    if (!start_at || !end_at) {
      return res.status(400).json({ error: '缺少必要的查询参数' });
    }
    if (!lqtoken) {
      return res.status(401).json({ error: '缺少lqtoken认证信息' });
    }

    const response = await axios.get(
      'https://opcenter.lanqiao.cn/api/v1/sms/sms-student/class-schedules/',
      {
        params: {
          start_at,
          end_at
        },
        headers: {
          Cookie: `lqtoken=${lqtoken}`
        }
      }
    );
    res.json({ data: response.data });
  } catch (error) {
    console.error('获取课程表错误:', error);
    res.status(500).json({ error: '获取课程表数据时出错' });
  }
});

app.get('/api/course-list', async (req, res) => {
  try {
    const lqtoken = req.query.lqtoken || req.headers['lqtoken'] || req.cookies?.lqtoken;
    if (!lqtoken) {
      return res.status(401).json({ error: '缺少lqtoken认证信息' });
    }

    const response = await axios.get(
      'https://opcenter.lanqiao.cn/api/v1/svc/sms/evaluation/student/course-list/',
      {
        headers: {
          Cookie: `lqtoken=${lqtoken}`,
          "saas-slug": "lyzyjsxy-lqb:student"
        }
      }
    );
    res.json({ data: response.data });
  } catch (error) {
    console.error('获取课程列表错误:', error);
    res.status(500).json({ error: '获取课程列表数据时出错' });
  }
});

app.post('/api/evaluation', async (req, res) => {
  try {
    const lqtoken = req.query.lqtoken || req.headers['lqtoken'] || req.cookies?.lqtoken;
    if (!lqtoken) {
      return res.status(401).json({ error: '缺少lqtoken认证信息' });
    }

    const response = await axios.post(
      'https://opcenter.lanqiao.cn/api/v1/svc/sms/evaluation/student/myweeks/',
      req.body,
      {
        headers: {
          Cookie: `lqtoken=${lqtoken}`
        }
      }
    );
    res.json({ data: response.data });
  } catch (error) {
    console.error('提交周评价错误:', error);
    res.status(500).json({ error: '提交周评价数据时出错' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

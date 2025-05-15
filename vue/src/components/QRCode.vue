<template>
  <div class="qrcode-container">
    <canvas ref="qrcode" v-show="!loginSuccess"></canvas>
    <div class="countdown" v-show="!loginSuccess">{{ countdown }}秒后刷新</div>
    <div class="success-message" v-show="loginSuccess">
      <div>登录成功！</div>
      <div class="user-name" v-if="userName">姓名：{{ userName }}</div>
    </div>
    <div class="report-container" v-if="loginSuccess">
      <div class="report-section">
        <h3>本周总结</h3>
        <textarea
          v-model="weeklyReport.summary"
          class="card-style input-style"
        ></textarea>
      </div>

      <div class="report-section">
        <h3>遇到的问题</h3>
        <textarea
          v-model="weeklyReport.problems"
          class="card-style input-style"
          placeholder="每行一个问题，按回车换行"
        ></textarea>
      </div>

      <div class="report-section">
        <h3>解决方案</h3>
        <textarea
          v-model="weeklyReport.solutions"
          class="card-style input-style"
          placeholder="每行一个解决方案，按回车换行"
        ></textarea>
      </div>

      <div class="report-section">
        <h3>下周计划</h3>
        <textarea
          v-model="weeklyReport.next_week_plan"
          class="card-style input-style"
          placeholder="每行一个计划，按回车换行"
        ></textarea>
      </div>
    </div>

    <div class="ai-input-container" v-if="loginSuccess">
      <input
        v-model="aiInput"
        @keyup.enter="callAI"
        placeholder="AI生成，请输入关键语句，按回车生成周报"
        class="ai-input"
      />
      <div class="loading-message" v-if="isLoading">正在生成中...</div>
    </div>

    <div class="submit-container" v-if="loginSuccess">
      <button
        @click="submitReport"
        class="submit-button"
        :disabled="isSubmitting"
      >
        {{ isSubmitting ? "提交中..." : "提交周报" }}
      </button>
      <div class="submit-message" v-if="submitSuccess">提交成功！</div>
    </div>
    <div class="course-select-container" v-if="loginSuccess">
      <select v-model="selectedCourse" class="course-select">
        <option disabled value="null">请选中一门课程</option>
        <option v-for="course in courseList" :value="{ course_id: course.course_id, course_id_yk: course.course_id_yk }">{{ course.course_name }}</option>
      </select>
    </div>
    <div class="course-content-container" v-if="loginSuccess">
      <h3>本周课程内容</h3>
      <div class="course-content">
        {{ courseContents }}
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import QRCode from "qrcode";
import axios from "axios";

const qrcode = ref(null);
const countdown = ref(60);
const loginSuccess = ref(false);
const userName = ref("");
const weeklyReport = ref({
  summary: "",
  problems: [],
  solutions: [],
  next_week_plan: [],
});
let timer = null;
const scene_str = ref("");
const aiInput = ref("");
const isLoading = ref(false);
const isSubmitting = ref(false);
const submitSuccess = ref(false);
const selectedCourse = ref(null);
const courseContents = ref("");
const courseList = ref([]);

const getClassSchedules = (lqtoken) => {

  if (!lqtoken) {
    console.error("lqtoken not found in URL");
    return;
  }

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(
    today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)
  );
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const endDate = sunday;

  const formatDate = (date) => date.toISOString().split("T")[0];

  axios
    .get(
      `http://115.190.37.111:3001/api/class-schedules?start_at=${formatDate(
        monday
      )}&end_at=${formatDate(sunday)}&lqtoken=${lqtoken}`
    )
    .then((response) => {
      courseContents.value = response.data.data.data
        .map((item) => item.ca_content)
        .join("\n\n");
    })
    
    .catch((error) => {
      console.error("获取课程表错误:", error);
    });
};

const getCourseList = (lqtoken) => {
   
  
  if (!lqtoken) {
    console.error("lqtoken not found in URL");
    return;
  }

  axios
    .get(`http://115.190.37.111:3001/api/course-list?lqtoken=${lqtoken}`)
    .then((response) => {
      courseList.value = response.data.data.data;
    })
    .catch((error) => {
      console.error("获取课程列表错误:", error);
    });
};


// 在登录成功后调用
const getUserInfo = (lqtoken) => {


  if (!lqtoken) {
    console.error("lqtoken not found in URL");
    return;
  }

  axios
    .get(`http://115.190.37.111:3001/api/user/basic?lqtoken=${lqtoken}`)
    .then((response) => {
      userName.value = response.data.data.name;
      getClassSchedules(lqtoken);
      getCourseList(lqtoken);
    })
    .catch((error) => {
      console.error("Get user info error:", error);
    });
};

const checkLoginStatus = () => {
  axios
    .get(`http://115.190.37.111:3001/api/scan-mp-login?scene_str=${scene_str.value}`)
    .then((loginResponse) => {
      if (loginResponse.data.lqtoken) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        document.cookie = `lqtoken=${
          loginResponse.data.lqtoken
        }; expires=${expirationDate.toUTCString()}; path=/`;
        loginSuccess.value = true;
        clearInterval(timer);
        getUserInfo(loginResponse.data.lqtoken);
      }
    })
    .catch((error) => {
      console.error("Login check error:", error);
    });
};

const generateQRCode = () => {
  axios
    .post("http://115.190.37.111:3001/api/create-qrcode")
    .then((response) => {
      const ticket = response.data.data.ticket;
      scene_str.value = response.data.data.scene_str;

      QRCode.toCanvas(
        qrcode.value,
        `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${ticket}`,
        {
          width: 200,
          margin: 2,
        }
      );
      startCountdown();
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

const startCountdown = () => {
  countdown.value = 60;
  timer = setInterval(() => {
    countdown.value--;
    checkLoginStatus();
    if (countdown.value <= 0) {
      clearInterval(timer);
      generateQRCode();
    }
  }, 1000);
};

onMounted(() => {
  generateQRCode();
});

const callAI = () => {
  isLoading.value = true;
  axios
    .post("http://115.190.37.111:3001/api/ai", { message: aiInput.value })
    .then((response) => {
      try {
        weeklyReport.value = JSON.parse(response.data.reply);
      } catch (error) {
        console.error("解析AI返回数据错误:", error);
      }
    })
    .catch((error) => {
      console.error("AI调用错误:", error);
    })
    .finally(() => {
      isLoading.value = false;
    });
};

const submitReport = () => {
  const lqtoken = document.cookie
    .split('; ')
    .find(row => row.startsWith('lqtoken='))
    ?.split('=')[1];
    console.log(lqtoken);
  if (!selectedCourse.value) {
    alert('请先选择课程');
    isSubmitting.value = false;
    return;
  }
  
  isSubmitting.value = true;
  submitSuccess.value = false;

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(
    today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1)
  );
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const endDate = sunday;

  const formatDate = (date) => date.toISOString().split("T")[0];
  const weekDetail = `${formatDate(monday)}~${formatDate(sunday)}`;

  const reportData = {
    week_detail: weekDetail,
    bind_courses: [selectedCourse.value.course_id],
    yk_course_ids: [selectedCourse.value.course_id_yk],
    summary: weeklyReport.value.summary,
    encountered_issues: weeklyReport.value.problems.join('\n').split('\n').join(','),
    solution: weeklyReport.value.solutions.join('\n').split('\n').join(','),
    next_week_plan: weeklyReport.value.next_week_plan.join('\n').split('\n').join(',')
  };
  axios
    .post("http://115.190.37.111:3001/api/evaluation", reportData, {
      headers: {
        'Content-Type': 'application/json',
        'lqtoken': lqtoken
      }
    })
    .then(() => {
      submitSuccess.value = true;
    })
    .catch((error) => {
      console.error("提交周报错误:", error);
    })
    .finally(() => {
      isSubmitting.value = false;
    });
};

onUnmounted(() => {
  if (timer) {
    clearInterval(timer);
  }
});
</script>

<style scoped>
.countdown {
  position: absolute;
  bottom: 20px;
  font-size: 16px;
  color: #666;
}

.qrcode-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  box-sizing: border-box;
}

.success-message {
  font-size: 24px;
  color: #42b883;
  font-weight: bold;
  margin-bottom: 20px;
  text-align: center;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s;
}
.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.report-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  padding: 0 15px;
}

.report-section {
  margin-bottom: 20px;
  padding: 15px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.report-section h3 {
  color: #42b883;
  margin-bottom: 12px;
  font-size: 18px;
}

.card-style {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  line-height: 1.6;
}

.input-style {
  width: 100%;
  min-height: 100px;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  resize: vertical;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
  max-width: 100%;
  overflow-wrap: break-word;
}

.input-style:focus {
  border-color: #42b883;
  outline: none;
}

.ai-input-container {
  margin-top: 20px;
  width: 100%;
  max-width: 500px;
  padding: 0 15px;
}

.ai-input {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  border: 1px solid #42b883;
  border-radius: 4px;
  transition: all 0.3s;
  box-sizing: border-box;
  max-width: 100%;
}

.ai-input:focus {
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.2);
  outline: none;
}

.submit-container {
  margin-top: 20px;
  width: 100%;
  max-width: 500px;
  padding: 0 15px;
  text-align: center;
}

.submit-button {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.submit-button:hover {
  background-color: #3aa876;
}

.submit-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.submit-message {
  margin-top: 10px;
  color: #42b883;
  font-weight: bold;
}

.ai-response {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  border-radius: 4px;
  white-space: pre-wrap;
}

.user-name {
  margin-top: 10px;
  font-size: 18px;
}

@media (max-width: 768px) {
  .report-container {
    width: 95%;
    padding: 0 10px;
  }

  .report-section {
    padding: 12px;
  }

  .input-style {
    min-height: 80px;
  }
}

@media (max-width: 480px) {
  .success-message {
    font-size: 20px;
  }

  .report-section h3 {
    font-size: 16px;
  }

  .input-style {
    min-height: 60px;
    font-size: 13px;
  }
}
.schedule-container {
  width: 100%;
  max-width: 800px;
  margin: 20px auto;
  padding: 0 15px;
}

.schedule-card {
  padding: 15px;
  margin-bottom: 15px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.schedule-date {
  font-weight: bold;
  color: #42b883;
  margin-bottom: 8px;
}

.schedule-course {
  font-size: 16px;
  margin-bottom: 5px;
}

.schedule-time {
  font-size: 14px;
  color: #666;
}

.course-select-container {
  width: 100%;
  max-width: 500px;
  margin: 20px auto;
  padding: 0 15px;
}

.course-select {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  border: 1px solid #42b883;
  border-radius: 4px;
  background-color: #f8f9fa;
  transition: all 0.3s;
}

.course-select:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(66, 184, 131, 0.2);
}
</style>

/* app.js - 铁道小卫士 H5 应用逻辑 */

/* ===== 状态管理 ===== */
function saveState() {
  try { localStorage.setItem('tdxws_state', JSON.stringify(STATE)); } catch(e) {}
}
function loadState() {
  try {
    var s = localStorage.getItem('tdxws_state');
    if (s) {
      var p = JSON.parse(s);
      if (p.scenarioScores && Array.isArray(p.scenarioScores)) STATE.scenarioScores = p.scenarioScores;
      if (typeof p.quizScore === 'number') STATE.quizScore = p.quizScore;
      if (Array.isArray(p.quizAnswers)) STATE.quizAnswers = p.quizAnswers;
      if (typeof p.totalScore === 'number') STATE.totalScore = p.totalScore;
      if (typeof p.nickname === 'string') STATE.nickname = p.nickname;
      if (typeof p.grade === 'string') STATE.grade = p.grade;
      if (typeof p.currentScenario === 'number') STATE.currentScenario = p.currentScenario;
      if (typeof p.advancedScore === 'number') STATE.advancedScore = p.advancedScore;
      if (typeof p.advancedDone === 'boolean') STATE.advancedDone = p.advancedDone;
      if (typeof p.finalQuizStarted === 'boolean') STATE.finalQuizStarted = p.finalQuizStarted;
      if (typeof p.midFoundCount === 'number') STATE.midFoundCount = p.midFoundCount;
      if (p.unlockedLevels) STATE.unlockedLevels = Object.assign({}, STATE.unlockedLevels, p.unlockedLevels);
      if (p.passedLevels) STATE.passedLevels = Object.assign({}, STATE.passedLevels, p.passedLevels);
    }
  } catch(e) {}
}

/* ===== 屏幕导航 ===== */
function goToScreen(screenId) {
  document.querySelectorAll('.screen').forEach(function(s) {
    s.classList.remove('active');
  });
  var target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
  var pb = document.getElementById('progressBar');
  if (screenId === 'screen-scenes') {
    pb.classList.add('show');
  } else {
    pb.classList.remove('show');
  }

  if (screenId === 'screen-scenes') renderScenario(STATE.currentScenario);
  if (screenId === 'screen-pledge') {
    var cb = document.getElementById('pledgeAgree');
    if (cb) cb.checked = false;
    var pb2 = document.getElementById('pledgeNextBtn');
    if (pb2) pb2.disabled = true;
    renderPledge();
    var backBtn = document.getElementById('pledgeBackBtn');
    if (backBtn) {
      if (STATE.grade === 'high') {
        backBtn.textContent = '返回首页';
        backBtn.setAttribute('onclick', "goToScreen('screen-intro')");
      } else {
        backBtn.textContent = '返回闯关';
        backBtn.setAttribute('onclick', "goToScreen('screen-scenes')");
      }
    }
  }
  if (screenId === 'screen-quiz') startQuiz();
  if (screenId === 'screen-cases') renderCases();
  if (screenId === 'screen-certificate') generateCertificate();
  saveState();
}

/* ===== 安全承诺 ===== */
function togglePledgeBtn() {
  var cb = document.getElementById('pledgeAgree');
  var btn = document.getElementById('pledgeNextBtn');
  if (btn) btn.disabled = !cb.checked;
}

function renderPledge() {
  var grade = STATE.grade || 'elementary';
  var p = PLEDGES[grade] || PLEDGES.elementary;
  var g = GRADES[grade];

  var titleEl = document.getElementById('pledgeTitle');
  if (titleEl) {
    titleEl.textContent = p.title;
    titleEl.style.color = g.color;
  }

  var introEl = document.getElementById('pledgeIntro');
  if (introEl) introEl.textContent = p.intro;

  var contentEl = document.getElementById('pledgeContent');
  if (!contentEl) return;
  contentEl.style.borderLeftColor = g.color;

  var html = '<p class="pledge-opening">我郑重承诺：</p>';
  p.items.forEach(function(item, i) {
    html += '<p class="pledge-item">' + (i + 1) + '. <strong>' + item.strong + '</strong>——' + item.text + '</p>';
  });
  html += '<p class="pledge-closing" style="color:' + g.color + '">' + p.closing + '</p>';
  contentEl.innerHTML = html;
}

function goBackFromPledge() {
  if (STATE.grade === 'high') {
    goToScreen('screen-intro');
  } else {
    goToScreen('screen-scenes');
  }
}

function proceedToQuiz() {
  var cb = document.getElementById('pledgeAgree');
  if (!cb || !cb.checked) return;
  goToScreen('screen-quiz');
}

/* ===== 学段选择 ===== */
function selectGrade(grade) {
  if (!STATE.unlockedLevels[grade]) {
    var order = ['elementary', 'middle', 'high'];
    var idx = order.indexOf(grade);
    var prev = order[idx - 1];
    var prevLabel = prev === 'elementary' ? '初级' : '中级';
    alert('请先通过' + prevLabel + '挑战才能解锁此难度');
    return;
  }
  STATE.grade = grade;
  STATE.currentScenario = 0;
  if (grade === 'middle') {
    STATE.scenarioScores = new Array(MIDDLE_SCENARIO_QUIZZES.length).fill(false);
  } else {
    STATE.scenarioScores = [false, false, false, false, false, false];
  }
  STATE.quizScore = 0;
  STATE.quizAnswers = [];
  STATE.totalScore = 0;
  STATE.startTime = Date.now();
  STATE.advancedDone = false;

  var g = GRADES[grade];

  if (grade === 'high') {
    STATE.advancedMode = true;
    goToScreen('screen-pledge');
  } else {
    document.getElementById('scenesSubtitle').textContent = g.desc + ' - 请在每个场景中选出正确做法';
    goToScreen('screen-scenes');
  }
}

/* ===== 更新首页卡片状态 ===== */
function updateGradeCards() {
  var order = ['elementary', 'middle', 'high'];
  var labels = { elementary: '初级', middle: '中级', high: '高级' };
  order.forEach(function(g) {
    var wrapper = document.querySelector('[data-grade="' + g + '"]');
    if (!wrapper) return;
    var btn = wrapper.querySelector('.grade-card');
    var status = wrapper.querySelector('.grade-card-status');
    btn.classList.remove('locked', 'passed');
    status.className = 'grade-card-status';
    status.textContent = '';

    var lockOverlay = btn.querySelector('.lock-overlay');

    if (!STATE.unlockedLevels[g]) {
      btn.classList.add('locked');
      if (lockOverlay) lockOverlay.style.display = 'flex';
      status.classList.add('locked');
      var prev = order[order.indexOf(g) - 1];
      var prevLabel = prev === 'elementary' ? '初级' : '中级';
      status.textContent = '通过' + prevLabel + '解锁';
    } else {
      if (lockOverlay) lockOverlay.style.display = 'none';
      var passed = STATE.passedLevels[g];
      if (passed) {
        btn.classList.add('passed');
        if (passed.level === 'excellent') {
          status.classList.add('excellent');
          status.textContent = '优秀 ' + passed.score + '分';
        } else {
          status.classList.add('passed');
          status.textContent = '合格 ' + passed.score + '分';
        }
      } else {
        status.textContent = '未挑战';
      }
    }
  });
}

/* ===== 场景插画（AI生成图片） ===== */
function getSceneSVG(id) {
  var imgs = ['scene1_crossing','scene2_fence','scene3_net','scene4_tracks','scene5_electric','scene6_throw'];
  return '<img src="images/' + (imgs[id-1] || imgs[0]) + '.jpg" alt="场景插图" />';
}
function _getSceneSVG_old(id) {
  var svgs = {
    1: '<svg class="scene-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">' +
       '<rect width="400" height="200" fill="#B0E0E6"/>' +
       '<rect y="140" width="400" height="60" fill="#8B7355"/>' +
       '<rect x="0" y="135" width="400" height="6" fill="#5A4A3A"/>' +
       '<rect x="30" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="70" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="322" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="362" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="80" y="155" width="250" height="3" fill="#4A4A4A"/>' +
       '<rect x="80" y="168" width="250" height="3" fill="#4A4A4A"/>' +
       '<line x1="0" y1="95" x2="400" y2="95" stroke="#E74C3C" stroke-width="5"/>' +
       '<line x1="0" y1="105" x2="400" y2="105" stroke="#FFF" stroke-width="5" stroke-dasharray="15,10"/>' +
       '<rect x="280" y="60" width="8" height="80" fill="#666"/>' +
       '<rect x="270" y="55" width="80" height="10" fill="#E74C3C" transform="rotate(-20 310 60)"/>' +
       '<circle cx="310" cy="50" r="6" fill="#E74C3C"><animate attributeName="opacity" values="1;0.3;1" dur="1s" repeatCount="indefinite"/></circle>' +
       '<circle cx="50" cy="115" r="12" fill="#FF8C42"/>' +
       '<rect x="42" y="110" width="16" height="20" rx="3" fill="#FF8C42"/>' +
       '<text x="200" y="40" font-size="14" fill="#E74C3C" text-anchor="middle" font-weight="bold">道口红灯！</text>' +
       '</svg>',
    2: '<svg class="scene-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">' +
       '<rect width="400" height="200" fill="#B0E0E6"/>' +
       '<rect y="140" width="400" height="60" fill="#90C695"/>' +
       '<g fill="#52C41A" stroke="#3A8A14" stroke-width="1">' +
       '<rect x="40" y="50" width="6" height="90"/>' +
       '<rect x="60" y="50" width="6" height="90"/>' +
       '<rect x="80" y="50" width="6" height="90"/>' +
       '<rect x="100" y="50" width="6" height="90"/>' +
       '<rect x="120" y="50" width="6" height="90"/>' +
       '<rect x="140" y="50" width="6" height="90"/>' +
       '<rect x="160" y="50" width="6" height="90"/>' +
       '<rect x="180" y="50" width="6" height="90"/>' +
       '</g>' +
       '<g stroke="#3A8A14" stroke-width="2">' +
       '<line x1="40" y1="70" x2="186" y2="70"/>' +
       '<line x1="40" y1="95" x2="186" y2="95"/>' +
       '<line x1="40" y1="120" x2="186" y2="120"/>' +
       '</g>' +
       '<rect y="140" width="400" height="6" fill="#5A4A3A"/>' +
       '<rect x="40" y="150" width="8" height="40" fill="#A9A9A9"/>' +
       '<rect x="80" y="155" width="310" height="3" fill="#4A4A4A"/>' +
       '<rect x="80" y="168" width="310" height="3" fill="#4A4A4A"/>' +
       '<circle cx="113" cy="45" r="10" fill="#FF8C42"/>' +
       '<rect x="106" y="52" width="14" height="25" rx="3" fill="#FF8C42" transform="rotate(15 113 65)"/>' +
       '<text x="280" y="40" font-size="14" fill="#E74C3C" text-anchor="middle" font-weight="bold">有人在翻越护栏！</text>' +
       '</svg>',
    3: '<svg class="scene-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">' +
       '<rect width="400" height="200" fill="#B0E0E6"/>' +
       '<rect y="140" width="400" height="60" fill="#90C695"/>' +
       '<g fill="#C0C0C0" stroke="#808080" stroke-width="1">' +
       '<rect x="30" y="50" width="5" height="90"/>' +
       '<rect x="48" y="50" width="5" height="90"/>' +
       '<rect x="66" y="50" width="5" height="90"/>' +
       '<rect x="84" y="50" width="5" height="90"/>' +
       '<rect x="102" y="50" width="5" height="90"/>' +
       '<rect x="120" y="50" width="5" height="90"/>' +
       '<rect x="180" y="50" width="5" height="90"/>' +
       '<rect x="198" y="50" width="5" height="90"/>' +
       '<rect x="216" y="50" width="5" height="90"/>' +
       '<rect x="234" y="50" width="5" height="90"/>' +
       '<rect x="252" y="50" width="5" height="90"/>' +
       '<rect x="270" y="50" width="5" height="90"/>' +
       '<rect x="288" y="50" width="5" height="90"/>' +
       '<rect x="306" y="50" width="5" height="90"/>' +
       '</g>' +
       '<g stroke="#808080" stroke-width="1.5">' +
       '<line x1="30" y1="70" x2="138" y2="70"/>' +
       '<line x1="180" y1="70" x2="311" y2="70"/>' +
       '<line x1="30" y1="95" x2="138" y2="95"/>' +
       '<line x1="180" y1="95" x2="311" y2="95"/>' +
       '<line x1="30" y1="120" x2="138" y2="120"/>' +
       '<line x1="180" y1="120" x2="311" y2="120"/>' +
       '</g>' +
       '<path d="M138 50 L155 70 L150 95 L160 120 L180 140 L170 120 L175 95 L165 70 L180 50 Z" fill="#E74C3C" opacity="0.6"/>' +
       '<circle cx="155" cy="100" r="10" fill="#FF8C42"/>' +
       '<rect x="148" y="107" width="14" height="22" rx="3" fill="#FF8C42"/>' +
       '<text x="280" y="40" font-size="14" fill="#E74C3C" text-anchor="middle" font-weight="bold">隔离网被破坏了！</text>' +
       '</svg>',
    4: '<svg class="scene-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">' +
       '<rect width="400" height="200" fill="#B0E0E6"/>' +
       '<rect y="140" width="400" height="60" fill="#8B7355"/>' +
       '<rect x="0" y="135" width="400" height="6" fill="#5A4A3A"/>' +
       '<rect x="30" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="70" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="330" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="370" y="145" width="8" height="50" fill="#A9A9A9"/>' +
       '<rect x="40" y="155" width="330" height="3" fill="#4A4A4A"/>' +
       '<rect x="40" y="168" width="330" height="3" fill="#4A4A4A"/>' +
       '<rect x="40" y="162" width="330" height="2" fill="#6A6A6A"/>' +
       '<circle cx="120" cy="148" r="10" fill="#FF8C42"/>' +
       '<rect x="113" y="155" width="14" height="18" rx="3" fill="#FF8C42"/>' +
       '<line x1="120" y1="173" x2="115" y2="160" stroke="#FF8C42" stroke-width="3"/>' +
       '<line x1="120" y1="173" x2="125" y2="160" stroke="#FF8C42" stroke-width="3"/>' +
       '<circle cx="200" cy="150" r="10" fill="#FFD93D"/>' +
       '<rect x="193" y="157" width="14" height="18" rx="3" fill="#FFD93D"/>' +
       '<circle cx="260" cy="148" r="6" fill="#888"/>' +
       '<text x="200" y="40" font-size="14" fill="#E74C3C" text-anchor="middle" font-weight="bold">有人在铁轨上玩耍！</text>' +
       '</svg>',
    5: '<svg class="scene-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">' +
       '<rect width="400" height="200" fill="#B0E0E6"/>' +
       '<rect y="140" width="400" height="60" fill="#90C695"/>' +
       '<line x1="0" y1="20" x2="400" y2="20" stroke="#333" stroke-width="2"/>' +
       '<line x1="50" y1="20" x2="50" y2="140" stroke="#666" stroke-width="3"/>' +
       '<line x1="150" y1="20" x2="150" y2="140" stroke="#666" stroke-width="3"/>' +
       '<line x1="250" y1="20" x2="250" y2="140" stroke="#666" stroke-width="3"/>' +
       '<line x1="350" y1="20" x2="350" y2="140" stroke="#666" stroke-width="3"/>' +
       '<line x1="0" y1="35" x2="400" y2="35" stroke="#E74C3C" stroke-width="1.5"/>' +
       '<line x1="0" y1="50" x2="400" y2="50" stroke="#E74C3C" stroke-width="1.5"/>' +
       '<text x="360" y="18" font-size="10" fill="#E74C3C" text-anchor="end">27.5kV</text>' +
       '<path d="M60 140 Q80 80 100 60 Q120 50 140 45" stroke="#FF8C42" stroke-width="1.5" fill="none" stroke-dasharray="5,3"/>' +
       '<polygon points="135,40 145,50 140,55" fill="#FF8C42"/>' +
       '<circle cx="145" cy="42" r="3" fill="#FF8C42"/>' +
       '<path d="M120 130 Q100 110 80 100" stroke="#888" stroke-width="1" fill="none"/>' +
       '<polygon points="75,98 85,102 80,108" fill="#888"/>' +
       '<rect x="55" y="105" width="1.5" height="35" fill="#8B4513"/>' +
       '<text x="200" y="170" font-size="14" fill="#E74C3C" text-anchor="middle" font-weight="bold">接触网附近放风筝！</text>' +
       '</svg>',
    6: '<svg class="scene-svg" viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg">' +
       '<rect width="400" height="200" fill="#B0E0E6"/>' +
       '<path d="M0 140 L100 80 L200 90 L300 75 L400 85 L400 200 L0 200 Z" fill="#90C695"/>' +
       '<rect y="155" width="400" height="45" fill="#8B7355"/>' +
       '<rect x="0" y="150" width="400" height="6" fill="#5A4A3A"/>' +
       '<rect x="20" y="160" width="8" height="35" fill="#A9A9A9"/>' +
       '<rect x="60" y="160" width="8" height="35" fill="#A9A9A9"/>' +
       '<rect x="340" y="160" width="8" height="35" fill="#A9A9A9"/>' +
       '<rect x="380" y="160" width="8" height="35" fill="#A9A9A9"/>' +
       '<rect x="30" y="170" width="360" height="3" fill="#4A4A4A"/>' +
       '<rect x="30" y="183" width="360" height="3" fill="#4A4A4A"/>' +
       '<rect x="200" y="110" width="80" height="30" rx="5" fill="#FFD93D"/>' +
       '<rect x="210" y="100" width="60" height="15" rx="3" fill="#FF8C42"/>' +
       '<rect x="215" y="105" width="15" height="8" fill="#1A5F9E"/>' +
       '<rect x="240" y="105" width="15" height="8" fill="#1A5F9E"/>' +
       '<circle cx="210" cy="145" r="6" fill="#444"/>' +
       '<circle cx="270" cy="145" r="6" fill="#444"/>' +
       '<circle cx="120" cy="75" r="10" fill="#FF8C42"/>' +
       '<rect x="113" y="82" width="14" height="18" rx="3" fill="#FF8C42"/>' +
       '<path d="M130 78 L180 95" stroke="#888" stroke-width="2" stroke-dasharray="4,3"/>' +
       '<circle cx="182" cy="97" r="4" fill="#888"/>' +
       '<text x="200" y="40" font-size="14" fill="#E74C3C" text-anchor="middle" font-weight="bold">有人向列车扔石头！</text>' +
       '</svg>'
  };
  return svgs[id] || svgs[1];
}

/* ===== 场景渲染 ===== */
function renderScenario(index) {
  var grade = STATE.grade || 'elementary';
  var totalScenes = grade === 'middle' ? MIDDLE_SCENARIO_QUIZZES.length : SCENARIOS.length;
  if (index >= totalScenes) {
    document.getElementById('scenarioContainer').innerHTML = '';
    document.getElementById('sceneNav').style.display = 'none';
    document.getElementById('scenesDone').style.display = 'block';
    updateProgress();
    return;
  }

  var s = SCENARIOS[index];
  var g = GRADES[grade];

  // 中级：使用带图单选题模式
  if (grade === 'middle') {
    if (index >= MIDDLE_SCENARIO_QUIZZES.length) {
      document.getElementById('scenarioContainer').innerHTML = '';
      document.getElementById('sceneNav').style.display = 'none';
      document.getElementById('scenesDone').style.display = 'block';
      updateProgress();
      return;
    }
    var mq = MIDDLE_SCENARIO_QUIZZES[index];
    var labels = ['A', 'B', 'C', 'D'];
    var optsHtml = '';
    mq.options.forEach(function(opt, i) {
      optsHtml += '<button class="quiz-option" onclick="handleMidScenarioQuiz(' + index + ', ' + i + ', this)" id="midopt_' + i + '">' +
        '<span class="opt-label">' + labels[i] + '</span>' +
        '<span>' + opt + '</span>' +
      '</button>';
    });

    var totalMid = MIDDLE_SCENARIO_QUIZZES.length;
    var html = '<div class="scene-card">' +
      '<div class="scene-header">' +
        '<span class="scene-number">第 ' + (index + 1) + ' 关 / 共 ' + totalMid + ' 关</span>' +
        '<span class="difficulty-badge diff-' + grade + '">' + g.name + ' ' + g.levelLabel + '</span>' +
      '</div>' +
      '<h3 class="scene-title">' + mq.title + '</h3>' +
      '<div class="scene-image"><img src="images/' + mq.image + '" alt="' + mq.title + '" /></div>' +
      '<div class="scene-quiz">' +
        '<div class="quiz-text">' + mq.question + '</div>' +
        '<div class="quiz-options">' + optsHtml + '</div>' +
        '<div class="quiz-explanation" id="midExp_' + index + '" style="display:none;">' + mq.explanation + '</div>' +
      '</div>' +
    '</div>';

    document.getElementById('scenarioContainer').innerHTML = html;
    var sceneNavEl = document.getElementById('sceneNav');
    if (sceneNavEl) sceneNavEl.style.display = 'flex';
    var nextBtnEl = document.getElementById('btnNextScene');
    if (nextBtnEl) nextBtnEl.style.display = 'none';
    var scenesDoneEl = document.getElementById('scenesDone');
    if (scenesDoneEl) scenesDoneEl.style.display = 'none';

    // 恢复已答题状态
    if (STATE.scenarioScores[index]) {
      var allBtns = document.querySelectorAll('#scenarioContainer .quiz-option');
      for (var bi = 0; bi < allBtns.length; bi++) {
        allBtns[bi].disabled = true;
        if (bi === mq.answer) allBtns[bi].classList.add('correct');
      }
      var expEl = document.getElementById('midExp_' + index);
      if (expEl) expEl.style.display = 'block';
      if (nextBtnEl) nextBtnEl.style.display = 'inline-block';
    }

    updateProgress();
    return;
  }

  var interaction = s.interactions[grade];
  var knowledge = s.knowledge[grade];

  var interactionHtml = '';
  if (interaction.type === 'find') {
    // 初级：找危险行为
    interactionHtml = '<div class="interaction-area">' +
      '<p class="interaction-prompt">' + interaction.hint + '</p>' +
      '<div class="choice-row">' +
        '<button class="choice-btn wrong-option" data-correct="false" onclick="handleChoice(' + index + ', false, this)">' + interaction.wrongBehaviors[0] + '</button>' +
        '<button class="choice-btn correct-option" data-correct="true" onclick="handleChoice(' + index + ', true, this)">' + interaction.correctBehaviors[0] + '</button>' +
      '</div>' +
    '</div>';
  } else if (interaction.type === 'find+quiz') {
    // 中级：找危险行为 + 1道原理题
    interactionHtml = '<div class="interaction-area">' +
      '<p class="interaction-prompt">' + interaction.hint + '</p>' +
      '<div class="choice-column">' +
        '<button class="choice-btn wrong-option" data-idx="0" onclick="handleFindMid(' + index + ', 0, true, this)">' + interaction.wrongBehaviors[0] + '</button>' +
        '<button class="choice-btn wrong-option" data-idx="1" onclick="handleFindMid(' + index + ', 1, true, this)">' + interaction.wrongBehaviors[1] + '</button>' +
        '<button class="choice-btn correct-option" data-idx="0" onclick="handleFindMid(' + index + ', 0, false, this)">' + interaction.correctBehaviors[0] + '</button>' +
        '<button class="choice-btn correct-option" data-idx="1" onclick="handleFindMid(' + index + ', 1, false, this)">' + interaction.correctBehaviors[1] + '</button>' +
      '</div>' +
      '<div class="find-progress" id="findProg_' + index + '">已找出 0 / ' + interaction.findCount + ' 个危险行为</div>' +
      '<div class="mid-quiz" id="midQuiz_' + index + '" style="display:none;">' +
        '<div class="quiz-divider">知识延伸题</div>' +
        '<p class="interaction-prompt">' + interaction.quiz.question + '</p>' +
        '<div class="choice-column">' +
          interaction.quiz.options.map(function(opt, i) {
            return '<button class="choice-btn" onclick="handleMidQuiz(' + index + ', ' + i + ', this)">' + opt + '</button>';
          }).join('') +
        '</div>' +
        '<div class="quiz-explanation" id="midExp_' + index + '"></div>' +
      '</div>' +
    '</div>';
  } else if (interaction.type === 'analysis') {
    // 高级：情境分析多选题
    interactionHtml = '<div class="interaction-area">' +
      '<p class="interaction-prompt">' + interaction.hint + '</p>' +
      '<div class="analysis-question">' + interaction.question + '</div>' +
      '<div class="choice-column">' +
        interaction.options.map(function(opt, i) {
          return '<label class="multi-choice"><input type="checkbox" value="' + i + '" onchange="handleMultiChange(' + index + ')"> <span>' + opt + '</span></label>';
        }).join('') +
      '</div>' +
      '<button class="submit-btn" id="submitBtn_' + index + '" onclick="submitAnalysis(' + index + ')">提交答案</button>' +
      '<div class="quiz-explanation" id="highExp_' + index + '"></div>' +
    '</div>';
  }

  var html = '<div class="scene-card">' +
    '<div class="scene-header">' +
      '<div class="scene-badge">' + (index + 1) + '</div>' +
      '<div class="scene-title">' + s.title + '</div>' +
      '<div class="scene-level" style="color:' + g.color + ';">' + g.levelLabel + ' ' + g.name + '</div>' +
    '</div>' +
    '<div class="scene-body">' +
      '<div class="scene-illustration">' + getSceneSVG(s.id) + '</div>' +
      '<div class="scene-desc">' + s.sceneDesc + '</div>' +
      interactionHtml +
      '<div class="knowledge-box" id="kb_' + index + '">' +
        '<div class="knowledge-label">安全知识</div>' +
        '<div class="knowledge-text">' + knowledge + '</div>' +
        '<div class="knowledge-score" id="ks_' + index + '">+10</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.getElementById('scenarioContainer').innerHTML = html;
  document.getElementById('sceneNav').style.display = 'flex';
  document.getElementById('btnNextScene').style.display = 'none';
  document.getElementById('scenesDone').style.display = 'none';

  if (index === 0) {
    document.getElementById('navPrev').textContent = '第一关';
  } else {
    var totalScenes = STATE.grade === 'middle' ? MIDDLE_SCENARIO_QUIZZES.length : SCENARIOS.length;
    document.getElementById('navPrev').textContent = '第 ' + (index + 1) + ' 关 / 共 ' + totalScenes + ' 关';
  }

  if (STATE.scenarioScores[index]) {
    var kb = document.getElementById('kb_' + index);
    if (kb) kb.classList.add('show');
    document.getElementById('btnNextScene').style.display = 'inline-block';
  }

  updateProgress();
}

/* ===== 中级场景单选题处理 ===== */
function handleMidScenarioQuiz(index, choiceIdx, btn) {
  var mq = MIDDLE_SCENARIO_QUIZZES[index];
  var correct = choiceIdx === mq.answer;

  // 禁用所有按钮
  var allBtns = document.querySelectorAll('#scenarioContainer .quiz-option');
  for (var i = 0; i < allBtns.length; i++) {
    allBtns[i].disabled = true;
    if (i === mq.answer) {
      allBtns[i].classList.add('correct');
    } else if (i === choiceIdx && !correct) {
      allBtns[i].classList.add('wrong');
    }
  }

  // 显示解析
  var expEl = document.getElementById('midExp_' + index);
  if (expEl) expEl.style.display = 'block';

  if (correct) {
    STATE.scenarioScores[index] = true;
  } else {
    var ks = document.getElementById('ks_' + index);
    if (ks) { ks.textContent = '+0'; ks.style.color = '#FF4D4F'; }
  }
  STATE.totalScore = STATE.scenarioScores.filter(function(s) { return s; }).length * 10;
  saveState();
  updateProgress();

  // 显示下一题按钮
  var nextBtn = document.getElementById('btnNextScene');
  if (nextBtn) nextBtn.style.display = 'inline-block';
}

/* ===== 初级：选择处理 ===== */
function handleChoice(scenarioIndex, isCorrect, btnEl) {
  if (STATE.scenarioScores[scenarioIndex]) return;

  var allBtns = document.querySelectorAll('.choice-btn');
  allBtns.forEach(function(b) { b.disabled = true; });

  if (isCorrect) {
    btnEl.classList.add('correct');
    STATE.scenarioScores[scenarioIndex] = true;
    showStarBurst();
  } else {
    btnEl.classList.add('wrong');
    allBtns.forEach(function(b) {
      if (b.getAttribute('data-correct') === 'true') b.classList.add('correct');
    });
    var ks = document.getElementById('ks_' + scenarioIndex);
    if (ks) { ks.textContent = '+0'; ks.style.color = '#FF4D4F'; }
  }

  var kb = document.getElementById('kb_' + scenarioIndex);
  if (kb) kb.classList.add('show');

  document.getElementById('btnNextScene').style.display = 'inline-block';
  saveState();
  updateProgress();
}

/* ===== 中级：找危险行为处理 ===== */
function handleFindMid(scenarioIndex, idx, isWrongBehavior, btnEl) {
  if (STATE.scenarioScores[scenarioIndex]) return;
  if (btnEl.disabled) return;

  var s = SCENARIOS[scenarioIndex];
  var interaction = s.interactions[STATE.grade];
  var foundCount = STATE.midFoundCount || 0;

  if (isWrongBehavior) {
    // 点中了危险行为，算找到一个
    btnEl.classList.add('wrong');
    btnEl.disabled = true;
    foundCount++;
    STATE.midFoundCount = foundCount;
    document.getElementById('findProg_' + scenarioIndex).textContent = '已找出 ' + foundCount + ' / ' + interaction.findCount + ' 个危险行为';

    if (foundCount >= interaction.findCount) {
      // 全部找到，显示知识延伸题
      document.querySelectorAll('.choice-btn').forEach(function(b) { b.disabled = true; });
      document.getElementById('midQuiz_' + scenarioIndex).style.display = 'block';
    }
  } else {
    // 点了正确做法（不是危险行为），提示错误
    btnEl.classList.add('wrong');
    btnEl.disabled = true;
  }

  saveState();
}

/* ===== 中级：知识延伸题处理 ===== */
function handleMidQuiz(scenarioIndex, optionIdx, btnEl) {
  if (STATE.scenarioScores[scenarioIndex]) return;

  var s = SCENARIOS[scenarioIndex];
  var quiz = s.interactions[STATE.grade].quiz;
  var allBtns = document.querySelectorAll('#midQuiz_' + scenarioIndex + ' .choice-btn');
  allBtns.forEach(function(b) { b.disabled = true; });

  var isCorrect = optionIdx === quiz.answer;
  if (isCorrect) {
    btnEl.classList.add('correct');
    STATE.scenarioScores[scenarioIndex] = true;
    showStarBurst();
  } else {
    btnEl.classList.add('wrong');
    allBtns.forEach(function(b, i) {
      if (i === quiz.answer) b.classList.add('correct');
    });
  }

  var expEl = document.getElementById('midExp_' + scenarioIndex);
  expEl.innerHTML = '<div class="exp-label">' + (isCorrect ? '回答正确！' : '回答错误') + '</div><div class="exp-text">' + quiz.explanation + '</div>';
  expEl.classList.add('show');

  var kb = document.getElementById('kb_' + scenarioIndex);
  if (kb) kb.classList.add('show');

  document.getElementById('btnNextScene').style.display = 'inline-block';
  STATE.midFoundCount = 0;
  saveState();
  updateProgress();
}

/* ===== 高级：多选选项变化 ===== */
function handleMultiChange(scenarioIndex) {
  // 简单的交互反馈，不做特殊处理
}

/* ===== 高级：提交分析答案 ===== */
function submitAnalysis(scenarioIndex) {
  if (STATE.scenarioScores[scenarioIndex]) return;

  var s = SCENARIOS[scenarioIndex];
  var interaction = s.interactions[STATE.grade];
  var checkboxes = document.querySelectorAll('.multi-choice input[type="checkbox"]:checked');
  var selected = [];
  checkboxes.forEach(function(cb) { selected.push(parseInt(cb.value)); });
  selected.sort();

  var correctAnswers = interaction.answer.slice().sort();
  var isCorrect = selected.length === correctAnswers.length &&
    selected.every(function(v, i) { return v === correctAnswers[i]; });

  // 禁用所有选项和按钮
  document.querySelectorAll('.multi-choice input').forEach(function(cb) { cb.disabled = true; });
  document.getElementById('submitBtn_' + scenarioIndex).disabled = true;

  // 标记正确/错误
  var allLabels = document.querySelectorAll('.multi-choice');
  allLabels.forEach(function(label, i) {
    var isAns = interaction.answer.indexOf(i) !== -1;
    var isSel = selected.indexOf(i) !== -1;
    if (isAns && isSel) label.classList.add('mc-correct');
    else if (!isAns && isSel) label.classList.add('mc-wrong');
    else if (isAns && !isSel) label.classList.add('mc-missed');
  });

  if (isCorrect) {
    STATE.scenarioScores[scenarioIndex] = true;
    showStarBurst();
  }

  var expEl = document.getElementById('highExp_' + scenarioIndex);
  expEl.innerHTML = '<div class="exp-label">' + (isCorrect ? '全部正确！' : '回答有误') + '</div><div class="exp-text">' + interaction.explanation + '</div>';
  expEl.classList.add('show');

  var kb = document.getElementById('kb_' + scenarioIndex);
  if (kb) kb.classList.add('show');

  document.getElementById('btnNextScene').style.display = 'inline-block';
  saveState();
  updateProgress();
}

/* ===== 下一关 ===== */
function nextScene() {
  STATE.currentScenario++;
  renderScenario(STATE.currentScenario);
  saveState();
}

/* ===== 进度更新 ===== */
function updateProgress() {
  var done = STATE.scenarioScores.filter(function(s) { return s; }).length;
  var total = STATE.grade === 'middle' ? MIDDLE_SCENARIO_QUIZZES.length : SCENARIOS.length;
  var pct = (done / total) * 100;
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = '探索进度 ' + done + '/' + total;
}

/* ===== 星星动画 ===== */
function showStarBurst() {
  var star = document.createElement('div');
  star.className = 'star-burst';
  star.innerHTML = '<svg width="80" height="80" viewBox="0 0 24 24" fill="#FFD93D"><path d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z"/></svg>';
  document.body.appendChild(star);
  setTimeout(function() { star.remove(); }, 800);
}

/* ===== 答题系统 ===== */
var quizTimer = null;
var quizTimeLeft = 20;
var quizMultiSelected = []; // 多选题临时选中状态
var quizCurrentIdx = 0;

function startQuiz() {
  quizCurrentIdx = 0;
  STATE.quizScore = 0;
  STATE.quizAnswers = [];
  STATE.advancedScore = 0;
  STATE.advancedDone = false;
  STATE.finalQuizStarted = false;
  document.getElementById('quizResult').style.display = 'none';
  renderQuestion(0);
}
function renderQuestion(idx) {
  var grade = STATE.grade || 'middle';
  var isAdvanced = grade === 'high';
  var isFinalPhase = isAdvanced && STATE.advancedDone;
  var questions = isFinalPhase ? QUIZZES[grade] : (isAdvanced ? ADVANCED_QUESTIONS : QUIZZES[grade]);
  if (idx >= questions.length) {
    showQuizResult();
    return;
  }
  quizCurrentIdx = idx;
  quizTimeLeft = isAdvanced ? 25 : 20;
  quizMultiSelected = [];

  var q = questions[idx];
  var isTf = q.type === 'tf';
  var isMulti = q.type === 'multi';
  var labels = isTf ? ['对', '错'] : ['A', 'B', 'C', 'D'];
  var displayOptions = isTf ? ['对', '错'] : q.options;
  var optsHtml = '';
  displayOptions.forEach(function(opt, i) {
    var clickFn = isMulti ? 'toggleMultiOption(' + i + ')' : 'handleQuizAnswer(' + i + ')';
    optsHtml += '<button class="quiz-option' + (isTf ? ' tf-option' : '') + (isMulti ? ' multi-option' : '') + '" onclick="' + clickFn + '" id="opt_' + i + '">' +
      '<span class="opt-label">' + labels[i] + '</span>' +
      '<span>' + opt + '</span>' +
    '</button>';
  });

  var submitBtnHtml = isMulti
    ? '<button class="btn btn-primary quiz-submit-btn" id="multiSubmitBtn" onclick="submitMultiAnswer()" disabled>提交答案</button>'
    : '';

  var imageHtml = isAdvanced && q.image
    ? '<div class="quiz-image"><img src="images/' + q.image + '" alt="情境图" /></div>'
    : '';

  var multiHint = isMulti ? '<div class="multi-hint">多选题，请选择所有正确答案</div>' : '';

  var html = '<div class="quiz-question' + (isAdvanced ? ' advanced-quiz' : '') + '">' +
    '<div class="quiz-timer" id="quizTimer">剩余 ' + quizTimeLeft + ' 秒</div>' +
    '<div class="quiz-number">第 ' + (idx + 1) + ' 题 / 共 ' + questions.length + ' 题' + (isAdvanced ? ' · 高级挑战' : '') + '</div>' +
    imageHtml +
    '<div class="quiz-text">' + q.question + '</div>' +
    multiHint +
    '<div class="quiz-options' + (isTf ? ' tf-options' : '') + '">' + optsHtml + '</div>' +
    submitBtnHtml +
    '<div class="quiz-explanation" id="quizExp">' + q.explanation + '</div>' +
    '</div>';

  document.getElementById('quizArea').innerHTML = html;

  if (quizTimer) clearInterval(quizTimer);
  quizTimer = setInterval(function() {
    quizTimeLeft--;
    var t = document.getElementById('quizTimer');
    if (t) {
      t.textContent = '剩余 ' + quizTimeLeft + ' 秒';
      if (quizTimeLeft <= 5) t.classList.add('urgent');
    }
    if (quizTimeLeft <= 0) {
      clearInterval(quizTimer);
      var curQ = questions[quizCurrentIdx];
      if (curQ && curQ.type === 'multi') {
        submitMultiAnswer(true);
      } else {
        handleQuizAnswer(-1);
      }
    }
  }, 1000);
}

function toggleMultiOption(idx) {
  var pos = quizMultiSelected.indexOf(idx);
  if (pos > -1) {
    quizMultiSelected.splice(pos, 1);
  } else {
    quizMultiSelected.push(idx);
  }
  var btn = document.getElementById('opt_' + idx);
  if (btn) {
    if (pos > -1) {
      btn.classList.remove('selected');
    } else {
      btn.classList.add('selected');
    }
  }
  var submitBtn = document.getElementById('multiSubmitBtn');
  if (submitBtn) submitBtn.disabled = quizMultiSelected.length === 0;
}

function submitMultiAnswer(timedOut) {
  if (quizTimer) clearInterval(quizTimer);
  var grade = STATE.grade || 'middle';
  var isAdvanced = grade === 'high';
  var isFinalPhase = isAdvanced && STATE.advancedDone;
  var questions = isFinalPhase ? QUIZZES[grade] : (isAdvanced ? ADVANCED_QUESTIONS : QUIZZES[grade]);
  var q = questions[quizCurrentIdx];
  var correctArr = q.answer || [];
  var selected = quizMultiSelected.slice().sort(function(a, b) { return a - b; });
  var sortedCorrect = correctArr.slice().sort(function(a, b) { return a - b; });
  var correct = selected.length === sortedCorrect.length &&
    selected.every(function(v, i) { return v === sortedCorrect[i]; });

  if (correct) {
    if (isAdvanced && !isFinalPhase) {
      STATE.advancedScore = (STATE.advancedScore || 0) + 1;
    } else {
      STATE.quizScore++;
    }
  }
  STATE.quizAnswers.push({ idx: quizCurrentIdx, selected: selected.slice(), correct: correct });

  for (var i = 0; i < q.options.length; i++) {
    var btn = document.getElementById('opt_' + i);
    if (btn) {
      btn.disabled = true;
      btn.classList.remove('selected');
      var isCorrect = correctArr.indexOf(i) > -1;
      var isSelected = selected.indexOf(i) > -1;
      if (isCorrect) {
        btn.classList.add('correct');
      } else if (isSelected) {
        btn.classList.add('wrong');
      }
    }
  }
  var submitBtn = document.getElementById('multiSubmitBtn');
  if (submitBtn) submitBtn.style.display = 'none';

  var exp = document.getElementById('quizExp');
  if (exp) exp.classList.add('show');

  var t = document.getElementById('quizTimer');
  if (t) {
    t.textContent = correct ? '回答正确！' : (timedOut ? '时间到了！' : '回答错误');
    t.classList.remove('urgent');
  }

  setTimeout(function() {
    renderQuestion(quizCurrentIdx + 1);
  }, 3000);
  saveState();
}

function handleQuizAnswer(selectedIdx) {
  var grade = STATE.grade || 'middle';
  var isAdvanced = grade === 'high';
  var isFinalPhase = isAdvanced && STATE.advancedDone;
  var questions = isFinalPhase ? QUIZZES[grade] : (isAdvanced ? ADVANCED_QUESTIONS : QUIZZES[grade]);
  var q = questions[quizCurrentIdx];
  if (q && q.type === 'multi') return; // 多选题走submitMultiAnswer

  if (quizTimer) clearInterval(quizTimer);
  var correct = selectedIdx === q.answer;

  if (correct) {
    if (isAdvanced && !isFinalPhase) {
      STATE.advancedScore = (STATE.advancedScore || 0) + 1;
    } else {
      STATE.quizScore++;
    }
  }
  STATE.quizAnswers.push({ idx: quizCurrentIdx, selected: selectedIdx, correct: correct });

  var optionCount = q.type === 'tf' ? 2 : (q.options ? q.options.length : 0);
  for (var i = 0; i < optionCount; i++) {
    var btn = document.getElementById('opt_' + i);
    if (btn) {
      btn.disabled = true;
      if (i === q.answer) {
        btn.classList.add('correct');
      } else if (i === selectedIdx) {
        btn.classList.add('wrong');
      }
    }
  }

  var exp = document.getElementById('quizExp');
  if (exp) exp.classList.add('show');

  var t = document.getElementById('quizTimer');
  if (t) {
    t.textContent = correct ? '回答正确！' : (selectedIdx === -1 ? '时间到了！' : '回答错误');
    t.classList.remove('urgent');
  }

  setTimeout(function() {
    renderQuestion(quizCurrentIdx + 1);
  }, 2500);
  saveState();
}

function showQuizResult() {
  document.getElementById('quizArea').innerHTML = '';
  var grade = STATE.grade || 'middle';
  var isAdvanced = grade === 'high';
  var isAdvancedPhase = isAdvanced && !STATE.advancedDone;

  var score = isAdvancedPhase ? (STATE.advancedScore || 0) : STATE.quizScore;
  var total;
  if (isAdvancedPhase) {
    total = ADVANCED_QUESTIONS.length;
  } else {
    total = QUIZZES[grade].length;
  }

  document.getElementById('quizFinalScore').textContent = score + '/' + total;
  document.getElementById('quizResult').style.display = 'block';

  if (isAdvancedPhase) {
    // 高级第一阶段（20道情境题）完成
    STATE.advancedDone = true;
    document.getElementById('quizResultLabel').textContent = '情境挑战完成！';
    document.getElementById('quizResultMsg').textContent = '你答对了 ' + score + '/' + total + ' 道现实情境题。接下来进入终极法律知识挑战！';
    var phasePct = total > 0 ? score / total : 0;
    var badgeEl = document.getElementById('quizBadge');
    if (badgeEl) badgeEl.style.display = phasePct >= 0.9 ? 'inline-block' : 'none';
    // 改变按钮文本
    var btn = document.querySelector('#quizResult .btn-primary');
    if (btn) btn.textContent = '进入终极挑战';
  } else {
    // 非高级或高级第二阶段完成 - 根据总成绩判断是否显示徽章
    var totalScore = 0;
    if (isAdvanced) {
      var part1 = ADVANCED_QUESTIONS.length > 0 ? Math.round((STATE.advancedScore || 0) / ADVANCED_QUESTIONS.length * 100) : 0;
      var part2 = QUIZZES[grade].length > 0 ? Math.round(STATE.quizScore / QUIZZES[grade].length * 100) : 0;
      totalScore = Math.round((part1 + part2) / 2);
    } else {
      var sceneDone = STATE.scenarioScores.filter(function(s) { return s; }).length;
      var totalScene = grade === 'middle' ? MIDDLE_SCENARIO_QUIZZES.length : 6;
      var s1 = Math.round((sceneDone / totalScene) * 100);
      var s2 = QUIZZES[grade].length > 0 ? Math.round((STATE.quizScore / QUIZZES[grade].length) * 100) : 0;
      totalScore = Math.round((s1 + s2) / 2);
    }
    document.getElementById('quizResultLabel').textContent = '答题完成！';
    document.getElementById('quizResultMsg').textContent = '两部分答题均已完成，接下来查看真实案例并领取证书。';
    var badgeEl2 = document.getElementById('quizBadge');
    if (badgeEl2) badgeEl2.style.display = totalScore >= 90 ? 'inline-block' : 'none';
    var btn2 = document.querySelector('#quizResult .btn-primary');
    if (btn2) btn2.textContent = '查看真实案例';
  }
}

/* ===== 答题结果页下一步 ===== */
function onQuizNext() {
  var grade = STATE.grade || 'middle';
  if (grade === 'high' && STATE.advancedDone && !STATE.finalQuizStarted) {
    // 高级：情境题完成后，进入终极法律知识挑战
    STATE.finalQuizStarted = true;
    STATE.quizScore = 0;
    STATE.quizAnswers = [];
    document.getElementById('quizResult').style.display = 'none';
    renderQuestion(0);
  } else {
    goToScreen('screen-cases');
  }
}

/* ===== 案例渲染 ===== */
function renderCases() {
  var html = '';
  CASES.forEach(function(c, i) {
    html += '<div class="case-card">' +
      '<div class="case-title">' + c.title + '</div>' +
      '<div class="case-info">' +
        '<div class="case-info-row"><span class="case-info-label">时间</span>' + c.date + '</div>' +
        '<div class="case-info-row"><span class="case-info-label">地点</span>' + c.location + '</div>' +
        '<div class="case-info-row"><span class="case-info-label">当事人</span>' + c.person + '</div>' +
      '</div>' +
      '<div class="case-strip">' +
        '<div class="case-panel">' +
          '<div class="case-panel-num">1</div>' +
          '<div class="case-panel-text">' + c.scene1 + '</div>' +
        '</div>' +
        '<div class="case-panel">' +
          '<div class="case-panel-num">2</div>' +
          '<div class="case-panel-text">' + c.scene2 + '</div>' +
        '</div>' +
        '<div class="case-panel">' +
          '<div class="case-panel-num">3</div>' +
          '<div class="case-panel-text">' + c.scene3 + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="case-lesson">' + c.lesson + '</div>' +
    '</div>';
  });
  document.getElementById('caseContainer').innerHTML = html;
}

/* ===== 证书生成 ===== */
function generateCertificate() {
  try {
  var grade = STATE.grade || 'middle';
  var g = GRADES[grade] || { name: '未知', color: '#999', levelLabel: '' };
  var isAdvanced = grade === 'high';
  var scores = STATE.scenarioScores || [false, false, false, false, false, false];
  var sceneDone = scores.filter(function(s) { return s; }).length;
  var quizScore = STATE.quizScore || 0;
  var totalScore = 0;
  var scoreDetail = '';

  // 两部分各自百分制，取平均分
  var part1Score = 0;
  var part2Score = 0;
  var part1Detail = '';
  var part2Detail = '';

  if (isAdvanced) {
    var advScore = STATE.advancedScore || 0;
    var finalScore = STATE.quizScore || 0;
    var totalAdv = ADVANCED_QUESTIONS.length;
    var totalFinal = (QUIZZES[grade] || []).length;
    part1Score = totalAdv > 0 ? Math.round((advScore / totalAdv) * 100) : 0;
    part2Score = totalFinal > 0 ? Math.round((finalScore / totalFinal) * 100) : 0;
    part1Detail = '情境题 ' + advScore + '/' + totalAdv + '（' + part1Score + '分）';
    part2Detail = '法律题 ' + finalScore + '/' + totalFinal + '（' + part2Score + '分）';
  } else {
    var totalQuiz = (QUIZZES[grade] || []).length;
    var totalScene = grade === 'middle' ? MIDDLE_SCENARIO_QUIZZES.length : 6;
    part1Score = Math.round((sceneDone / totalScene) * 100);
    part2Score = totalQuiz > 0 ? Math.round((quizScore / totalQuiz) * 100) : 0;
    part1Detail = '场景闯关 ' + sceneDone + '/' + totalScene + '（' + part1Score + '分）';
    part2Detail = '知识答题 ' + quizScore + '/' + totalQuiz + '（' + part2Score + '分）';
  }

  totalScore = Math.round((part1Score + part2Score) / 2);
  scoreDetail = part1Detail + ' + ' + part2Detail;

  var nickname = STATE.nickname || '';
  if (!nickname) {
    showNicknameModal(function(name) {
      if (name) {
        STATE.nickname = name;
        saveState();
      }
      finishCertificate(grade, g, isAdvanced, sceneDone, quizScore, totalScore, scoreDetail, name || '匿名同学');
    });
    return;
  }

  // 判断等级并完成证书渲染
  finishCertificate(grade, g, isAdvanced, sceneDone, quizScore, totalScore, scoreDetail, nickname);
  } catch(e) {
    var errEl = document.getElementById('certCard');
    if (errEl) {
      errEl.innerHTML = '<div style="padding:20px;text-align:center;color:#FF4D4F"><p>证书生成出错</p><p style="font-size:12px">' + e.message + '</p><button class="btn btn-primary" onclick="goHome()">返回首页</button></div>';
    }
  }
}

function showNicknameModal(callback) {
  var overlay = document.getElementById('nicknameOverlay');
  var input = document.getElementById('nicknameInput');
  if (!overlay || !input) {
    callback('');
    return;
  }
  overlay.style.display = 'flex';
  input.value = '';
  setTimeout(function() { input.focus(); }, 100);

  window._nicknameCallback = callback;
}

function confirmNickname() {
  var overlay = document.getElementById('nicknameOverlay');
  var input = document.getElementById('nicknameInput');
  var name = '';
  if (input && input.value.trim()) {
    name = input.value.trim().substring(0, 20);
  }
  if (overlay) overlay.style.display = 'none';
  var cb = window._nicknameCallback;
  window._nicknameCallback = null;
  if (cb) cb(name);
}

function cancelNickname() {
  var overlay = document.getElementById('nicknameOverlay');
  if (overlay) overlay.style.display = 'none';
  var cb = window._nicknameCallback;
  window._nicknameCallback = null;
  if (cb) cb('');
}

function finishCertificate(grade, g, isAdvanced, sceneDone, quizScore, totalScore, scoreDetail, nickname) {
  try {
  // 判断等级：优秀(平均分≥90) / 合格(平均分≥60) / 不合格(<60)
  var certLevel = '';
  var certLevelLabel = '';
  var certLevelColor = '';
  if (totalScore >= 90) {
    certLevel = 'excellent';
    certLevelLabel = '优秀';
    certLevelColor = '#FF8C42';
  } else if (totalScore >= 60) {
    certLevel = 'pass';
    certLevelLabel = '合格';
    certLevelColor = '#52C41A';
  } else {
    certLevel = 'fail';
    certLevelLabel = '未通过';
    certLevelColor = '#FF4D4F';
  }

  // 记录通过状态并解锁下一级
  if (certLevel !== 'fail') {
    if (!STATE.passedLevels) STATE.passedLevels = {};
    STATE.passedLevels[grade] = { level: certLevel, score: totalScore, label: certLevelLabel };
    var order = ['elementary', 'middle', 'high'];
    var nextIdx = order.indexOf(grade) + 1;
    if (nextIdx < order.length) {
      if (!STATE.unlockedLevels) STATE.unlockedLevels = {};
      STATE.unlockedLevels[order[nextIdx]] = true;
    }
    saveState();
  }

  function setEl(id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  var certCard = document.getElementById('certCard');
  var failCard = document.getElementById('failCard');

  if (certLevel === 'fail') {
    if (certCard) certCard.style.display = 'none';
    if (failCard) failCard.style.display = 'block';
    setEl('failScore', totalScore);
    setEl('failGrade', g.name);
    setEl('failDetail', scoreDetail);
    return;
  }

  if (certCard) certCard.style.display = 'block';
  if (failCard) failCard.style.display = 'none';

  setEl('certName', nickname || '匿名同学');
  setEl('certGrade', g.name);
  setEl('certScenes', scoreDetail);
  setEl('certTotalScore', totalScore);
  setEl('certPledge', PLEDGE);

  var certTitle = document.getElementById('certTitle');
  if (certTitle) certTitle.textContent = '答题能手合格证书';
  var certLevelEl = document.getElementById('certLevel');
  if (certLevelEl) {
    certLevelEl.textContent = certLevelLabel;
    certLevelEl.style.color = certLevelColor;
  }

  var certId = 'TDXWS-' + String(Date.now()).slice(-6);
  setEl('certId', '证书编号：' + certId);

  var pledgeNum = 12856 + Math.floor(Math.random() * 500);
  setEl('pledgeCount', pledgeNum.toLocaleString());

  drawCertCanvas(totalScore, certLevel, certLevelLabel);

  // 填充已通过等级信息
  var summaryEl = document.getElementById('certLevelsSummary');
  var nextEl = document.getElementById('certNextAction');
  if (summaryEl) {
    var sOrder = ['elementary', 'middle', 'high'];
    var sLabels = { elementary: '初级', middle: '中级', high: '高级' };
    var sHtml = '<h4>挑战进度</h4>';
    sOrder.forEach(function(lv) {
      var passed = (STATE.passedLevels || {})[lv];
      var unlocked = (STATE.unlockedLevels || {})[lv];
      if (passed) {
        sHtml += '<span class="cert-level-badge ' + (passed.level === 'excellent' ? 'excellent' : 'pass') + '">' + sLabels[lv] + ' ' + passed.label + ' ' + passed.score + '分</span>';
      } else if (unlocked) {
        sHtml += '<span class="cert-level-badge unlocked">' + sLabels[lv] + ' 未挑战</span>';
      } else {
        sHtml += '<span class="cert-level-badge" style="background:#F0F0F0;color:#999">' + sLabels[lv] + ' 未解锁</span>';
      }
    });
    summaryEl.innerHTML = sHtml;
  }
  if (nextEl) {
    var nOrder = ['elementary', 'middle', 'high'];
    var nIdx = nOrder.indexOf(grade) + 1;
    if (nIdx < nOrder.length && (STATE.unlockedLevels || {})[nOrder[nIdx]]) {
      var nLabel = nOrder[nIdx] === 'middle' ? '中级' : '高级';
      nextEl.innerHTML = '<p style="color:#1A5F9E;font-size:14px;margin-bottom:8px">已解锁' + nLabel + '挑战！</p><button class="btn btn-primary" onclick="selectGrade(\'' + nOrder[nIdx] + '\')">挑战' + nLabel + '</button>';
    } else if (nIdx >= nOrder.length) {
      nextEl.innerHTML = '<p style="color:#FF8C42;font-size:14px;font-weight:700">恭喜！你已通过全部等级挑战！</p>';
    }
  }
  } catch(e) {
    var errEl = document.getElementById('certCard');
    if (errEl) {
      errEl.innerHTML = '<div style="padding:20px;text-align:center;color:#FF4D4F"><p>证书生成出错</p><p style="font-size:12px">' + e.message + '</p><button class="btn btn-primary" onclick="goHome()">返回首页</button></div>';
    }
  }
}

function drawCertCanvas(score, level, levelLabel) {
  var canvas = document.getElementById('certCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var w = canvas.width;
  var h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // 背景
  ctx.fillStyle = '#F7F9FC';
  ctx.fillRect(0, 0, w, h);

  // 标题
  ctx.fillStyle = '#1A5F9E';
  ctx.font = 'bold 18px "PingFang SC", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('答题能手合格证书', w / 2, 28);

  // 等级标签
  var levelColor = level === 'excellent' ? '#FF8C42' : '#52C41A';
  ctx.fillStyle = levelColor;
  ctx.font = 'bold 14px "PingFang SC", sans-serif';
  ctx.fillText('等级：' + levelLabel, w / 2, 50);

  // 得分进度条
  var barY = 62;
  var barH = 20;
  var barW = (score / 100) * (w - 40);
  var gradient = ctx.createLinearGradient(20, 0, 20 + barW, 0);
  if (level === 'excellent') {
    gradient.addColorStop(0, '#52C41A');
    gradient.addColorStop(1, '#FF8C42');
  } else {
    gradient.addColorStop(0, '#52C41A');
    gradient.addColorStop(1, '#1A5F9E');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(20, barY, Math.max(5, barW), barH);
  ctx.strokeStyle = '#D0D7DE';
  ctx.lineWidth = 1;
  ctx.strokeRect(20, barY, w - 40, barH);

  // 分数文字
  ctx.fillStyle = '#2C3E50';
  ctx.font = 'bold 16px "PingFang SC", sans-serif';
  ctx.fillText(score + ' / 100 分', w / 2, barY + barH + 22);

  // 底部5格进度条
  var bars = 5;
  var bw = (w - 40) / bars;
  for (var i = 0; i < bars; i++) {
    ctx.fillStyle = i < Math.ceil(score / 20) ? levelColor : '#E0E6ED';
    ctx.fillRect(20 + i * bw + 2, h - 12, bw - 4, 6);
  }
}

/* ===== 分享 ===== */
/* ===== 重新挑战 ===== */
function restartQuiz() {
  // 重置答题相关状态，保留昵称和难度
  var grade = STATE.grade;
  STATE.currentScenario = 0;
  if (grade === 'middle') {
    STATE.scenarioScores = new Array(MIDDLE_SCENARIO_QUIZZES.length).fill(false);
  } else {
    STATE.scenarioScores = [false, false, false, false, false, false];
  }
  STATE.quizScore = 0;
  STATE.quizAnswers = [];
  STATE.totalScore = 0;
  STATE.advancedDone = false;
  STATE.advancedScore = 0;
  STATE.finalQuizStarted = false;
  STATE.startTime = Date.now();
  saveState();
  if (grade === 'high') {
    goToScreen('screen-quiz');
  } else {
    goToScreen('screen-scenes');
  }
}

function toggleAbout() {
  var modal = document.getElementById('aboutModal');
  if (!modal) return;
  if (modal.style.display === 'none') {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  } else {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function goHome() {
  STATE.grade = null;
  STATE.currentScenario = 0;
  STATE.scenarioScores = [false, false, false, false, false, false];
  STATE.quizScore = 0;
  STATE.quizAnswers = [];
  STATE.totalScore = 0;
  STATE.advancedDone = false;
  STATE.advancedScore = 0;
  STATE.finalQuizStarted = false;
  saveState();
  updateGradeCards();
  goToScreen('screen-intro');
}

function shareResult(evt) {
  var grade = STATE.grade || 'middle';
  var g = GRADES[grade];
  var totalScore = 0;

  if (grade === 'high') {
    var advScore = STATE.advancedScore || 0;
    var finalScore = STATE.quizScore || 0;
    var totalAdv = ADVANCED_QUESTIONS.length;
    var totalFinal = QUIZZES[grade].length;
    var part1 = totalAdv > 0 ? Math.round((advScore / totalAdv) * 100) : 0;
    var part2 = totalFinal > 0 ? Math.round((finalScore / totalFinal) * 100) : 0;
    totalScore = Math.round((part1 + part2) / 2);
  } else {
    var sceneDone = STATE.scenarioScores.filter(function(s) { return s; }).length;
    var totalQuiz = QUIZZES[grade].length;
    var totalScene = grade === 'middle' ? MIDDLE_SCENARIO_QUIZZES.length : 6;
    var part1 = Math.round((sceneDone / totalScene) * 100);
    var part2 = totalQuiz > 0 ? Math.round((STATE.quizScore / totalQuiz) * 100) : 0;
    totalScore = Math.round((part1 + part2) / 2);
  }

  var levelLabel = totalScore >= 90 ? '优秀' : (totalScore >= 60 ? '合格' : '未通过');
  var shareText = '我在《铁道小卫士》铁路安全互动课堂' + g.name + '挑战中获得了 ' + totalScore + ' 分，等级：' + levelLabel + '！快来试试吧！';
  var fullText = shareText + '\n' + window.location.href;
  var btn = evt && evt.currentTarget;
  var origText = btn ? btn.textContent : '';

  function showCopyFeedback(msg) {
    if (btn) {
      btn.textContent = msg;
      setTimeout(function() { btn.textContent = origText; }, 2000);
    }
  }

  if (navigator.share) {
    navigator.share({
      title: '铁道小卫士 - 铁路安全互动课堂',
      text: shareText,
      url: window.location.href
    }).catch(function() {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(fullText).then(function() {
      showCopyFeedback('已复制到剪贴板');
    }).catch(function() {
      fallbackCopy(fullText, showCopyFeedback);
    });
  } else {
    fallbackCopy(fullText, showCopyFeedback);
  }
}

function fallbackCopy(text, callback) {
  var textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    if (callback) callback('已复制到剪贴板');
  } catch(e) {
    if (callback) callback('复制失败，请手动复制');
  }
  textarea.remove();
}

function copyLink(evt) {
  var url = window.location.href;
  var btn = evt && evt.currentTarget;
  var origText = btn ? btn.textContent : '';

  function showFeedback(msg) {
    if (btn) {
      btn.textContent = msg;
      setTimeout(function() { btn.textContent = origText; }, 2000);
    }
  }

  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(function() {
      showFeedback('链接已复制');
    }).catch(function() {
      fallbackCopy(url, showFeedback);
    });
  } else {
    fallbackCopy(url, showFeedback);
  }
}

/* ===== 初始化 ===== */
(function init() {
  // 版本检查：清除旧版本状态
  var VER = 'v1.2.0';
  var savedVer = localStorage.getItem('tdxws_ver');
  if (savedVer !== VER) {
    localStorage.removeItem('tdxws_state');
    localStorage.setItem('tdxws_ver', VER);
  }
  loadState();
  updateGradeCards();
  var footerVer = document.getElementById('footerVersion');
  if (footerVer) footerVer.textContent = '版本 ' + VER;
  var aboutVer = document.getElementById('aboutVersion');
  if (aboutVer) aboutVer.textContent = VER;
  if (STATE.grade && STATE.currentScenario > 0 && document.querySelector('#screen-scenes.active')) {
    var pb = document.getElementById('progressBar');
    pb.classList.add('show');
  }
})();

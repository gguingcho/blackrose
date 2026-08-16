/* ==========================================================================
   검은 장미는 피를 사랑한다 — 로그인 없는 댓글 위젯
   서버가 없는 정적 사이트라, 새로 남긴 댓글은 "이 브라우저에서만" 보입니다.
   (새로고침하면 시드 댓글로 초기화됩니다. 실제로 방문자끼리 댓글을 공유하려면
    Cloudflare Pages Functions + KV 같은 백엔드가 필요합니다.)
   ========================================================================== */

(function(){

  // ---- 시드용 고정 랜덤 (매번 새로고침해도 같은 100개가 나오도록) ----
  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const NICKS = [
    "장미덕후","도겸당원","서준최애","비서실1인","집착BL러버","까망고양이","레드로즈","우디향중독",
    "밤샘완독","야근각","이불킥중","심장못참겠다","사이다중독","고구마먹는중","눈물버튼","떡밥헌터",
    "회귀중","완결까지가자","일단정주행","이거실화냐","다음화기다림","혈압상승중","팬아트준비중",
    "부회장님팬클럽","비서준생","도겸이바라기","서준이지킴이","월요병치료제","불면증유발자","심쿵주의",
    "정주행완료","1화부터정주행","알람맞춰놓음","연참좋아","작가님사랑해요","독자1","독자2","익명의독자",
    "지나가던독자","떡밥수집가","이야기중독","BL홀릭","로맨스홀릭","한입만","궁금해미치겠다","우산씬못잊음",
  ];

  const TOP_TEMPLATES = [
    "미쳤다 진짜... {ep} 보고 심장 나갔어요",
    "작가님 이거 다음화 언제 나와요 저 오늘 못 자요",
    "윤도겸 캐릭터 미쳤다 진짜 이런 남자 어디 없나요",
    "한서준 반응 하나하나가 너무 현실적이라 몰입 미쳤음",
    "{ep} 읽고 회사에서 혼자 웃었다가 팀장님한테 이상한 눈초리 받음",
    "이거 완결까지 얼마나 남았어요 벌써 조마조마함",
    "손목 잡는 장면에서 진짜 소리 지를 뻔",
    "작가님 필력 미쳤어요 진짜 웹소설계의 보물",
    "정주행하다가 여기까지 왔는데 다음화 없어서 웁니다",
    "우디향 묘사 나올 때마다 향수 사러 가고 싶어짐",
    "이 소설 보다가 회사 일 손에 안 잡혀요 큰일났다",
    "나수아랑 정재현 케미도 너무 좋아요 조연들 다 사랑스러움",
    "부회장님 츤데레력 실화냐 화낸 거 아니야 이 대사 미쳤다",
    "매화 클리프행어 지옥이라 심장에 안 좋음",
    "친구한테 추천했다가 같이 폐인 됨",
    "이런 장르 진짜 오랜만에 제대로 만났다",
    "회귀도 아니고 빙의도 아닌데 왜 이렇게 몰입되지",
    "{ep} 마지막 문장 보고 화면 껐다 켰다 세 번 함",
    "이 정도면 유료 결제각인데 다음화 빨리 풀렸으면",
    "진짜 오랜만에 정주행하면서 소리내서 헉 소리냄",
  ];

  const MID_TEMPLATES = [
    "재밌게 보고 있어요 다음화 기다릴게요",
    "필력 좋으시네요 앞으로도 기대할게요",
    "캐릭터들 매력 있어서 계속 보게 되네요",
    "{ep} 잘 봤습니다 다음 편도 기대돼요",
    "요즘 이 소설 보는 재미로 살아요",
    "전개 속도 딱 좋은 것 같아요",
    "문장이 깔끔해서 술술 읽혀요",
    "설정이 신선해서 좋았습니다",
    "댓글 눈팅만 하다가 처음 남겨봐요 재밌어요",
    "다음화 언제 올라오나요 알림 신청했어요",
    "몰입감 좋아서 시간 가는 줄 몰랐어요",
    "두 사람 케미 좋네요 응원합니다",
    "표지도 예쁘고 내용도 좋아요",
    "이런 클리셰 은근 좋아하는데 잘 살리시네요",
    "작가님 다른 작품도 찾아볼게요",
  ];

  const LOW_TEMPLATES = [
    "정주행 시작합니다",
    "재밌네요",
    "다음화 기다려요",
    "저장하고 나중에 정주행할게요",
    "북마크 완료",
    "괜찮은데요?",
    "흥미롭게 보고 있어요",
    "이제 3화까지 봤어요",
    "무료 회차 다 봤어요 아쉽다",
    "일단 팔로우 해놓을게요",
  ];

  const REPLY_TEMPLATES = [
    "완전 공감이요 ㅠㅠ",
    "저도 그 장면에서 심장 나갈 뻔",
    "맞아요 저도 그 부분 다시 읽었어요",
    "ㅋㅋㅋㅋ 저만 그런 거 아니었네요",
    "저도 알람 맞춰놨어요",
    "인정합니다 진짜 필력 미쳤음",
    "저도 회사에서 몰래 봄 ㅋㅋㅋ",
    "다음화 같이 기다려요 우리",
    "저도 친구한테 영업했어요",
    "그 대사 저도 캡처해놨어요",
    "진짜 너무 좋았어요 이 화",
    "저도 그거 보고 소름 돋았어요",
  ];

  function pick(rand, arr){ return arr[Math.floor(rand()*arr.length)]; }

  function fmtDate(d){
    const now = new Date();
    const diffMs = now - d;
    const min = Math.floor(diffMs/60000);
    if(min < 1) return "방금 전";
    if(min < 60) return `${min}분 전`;
    const hr = Math.floor(min/60);
    if(hr < 24) return `${hr}시간 전`;
    const day = Math.floor(hr/24);
    if(day < 7) return `${day}일 전`;
    const wk = Math.floor(day/7);
    if(wk < 5) return `${wk}주 전`;
    const mo = Math.floor(day/30);
    return `${mo}달 전`;
  }

  function avatarColor(name){
    let h = 0;
    for(let i=0;i<name.length;i++) h = (h*31 + name.charCodeAt(i)) % 360;
    return `hsl(${h}, 55%, 42%)`;
  }

  function genComments(seed, count, epLabel){
    const rand = mulberry32(seed);
    const usedNicks = new Set();
    const comments = [];
    const nowMs = Date.now();

    for(let i=0;i<count;i++){
      let nick = pick(rand, NICKS);
      // 중복 닉네임에 숫자 붙이기
      let base = nick, n = 2;
      while(usedNicks.has(nick)){ nick = base + n; n++; }
      usedNicks.add(nick);

      // 좋아요 분포: 상위 8% 정도만 크게, 나머지는 낮게 (베스트 댓글 연출)
      const tier = rand();
      let likes, text;
      if(tier < 0.08){
        likes = Math.floor(120 + rand()*780);
        text = pick(rand, TOP_TEMPLATES);
      } else if(tier < 0.4){
        likes = Math.floor(8 + rand()*60);
        text = pick(rand, MID_TEMPLATES);
      } else {
        likes = Math.floor(rand()*10);
        text = pick(rand, LOW_TEMPLATES);
      }
      text = text.replace("{ep}", epLabel);

      const daysAgo = rand()*30;
      const date = new Date(nowMs - daysAgo*86400000 - rand()*3600000);

      const replies = [];
      if(rand() < 0.18){
        const rc = 1 + Math.floor(rand()*3);
        for(let r=0;r<rc;r++){
          let rn = pick(rand, NICKS);
          let rbase = rn, rnI = 2;
          while(usedNicks.has(rn)){ rn = rbase+rnI; rnI++; }
          usedNicks.add(rn);
          replies.push({
            id: `${i}-r${r}`,
            name: rn,
            text: pick(rand, REPLY_TEMPLATES),
            likes: Math.floor(rand()*15),
            date: new Date(date.getTime() + (r+1)*3600000*rand()*10),
          });
        }
      }

      comments.push({ id:'c'+i, name:nick, text, likes, date, replies });
    }
    return comments;
  }

  function render(root, state){
    const { comments, sort, name: draftName, text: draftText } = state;

    const sorted = [...comments].sort((a,b) => {
      if(sort === 'popular') return b.likes - a.likes || (b.date - a.date);
      return b.date - a.date;
    });

    const best = [...comments].sort((a,b)=>b.likes-a.likes).slice(0,3).filter(c=>c.likes>0);

    const totalCount = comments.reduce((s,c)=>s+1+c.replies.length, 0);

    function commentHtml(c, isBest){
      const repliesVisible = state.openReplies.has(c.id);
      const repliesHtml = c.replies.length ? `
        <div class="cmt-replies-toggle" data-toggle="${c.id}">
          ${repliesVisible ? '▲ 답글 숨기기' : `▼ 답글 ${c.replies.length}개 보기`}
        </div>
        <div class="cmt-replies" style="display:${repliesVisible ? 'block':'none'}">
          ${c.replies.map(r => `
            <div class="cmt-item cmt-reply">
              <div class="cmt-avatar" style="background:${avatarColor(r.name)}">${r.name[0]}</div>
              <div class="cmt-body">
                <div class="cmt-head"><span class="cmt-name">${r.name}</span><span class="cmt-date">${fmtDate(r.date)}</span></div>
                <div class="cmt-text">${r.text}</div>
                <div class="cmt-actions">
                  <button class="cmt-like" data-like="${r.id}">♥ ${r.likes}</button>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : '';

      return `
        <div class="cmt-item ${isBest?'cmt-best':''}" data-id="${c.id}">
          <div class="cmt-avatar" style="background:${avatarColor(c.name)}">${c.name[0]}</div>
          <div class="cmt-body">
            <div class="cmt-head">
              ${isBest ? '<span class="cmt-best-badge">BEST</span>' : ''}
              <span class="cmt-name">${c.name}</span><span class="cmt-date">${fmtDate(c.date)}</span>
            </div>
            <div class="cmt-text">${c.text}</div>
            <div class="cmt-actions">
              <button class="cmt-like" data-like="${c.id}">♥ ${c.likes}</button>
              <button class="cmt-reply-btn" data-reply="${c.id}">답글달기</button>
            </div>
            <div class="cmt-reply-form" id="rf-${c.id}" style="display:none">
              <input type="text" class="cmt-reply-name" placeholder="닉네임 (비우면 익명)">
              <textarea class="cmt-reply-text" placeholder="답글을 남겨보세요"></textarea>
              <button class="btn btn-primary cmt-reply-submit" data-submit-reply="${c.id}">등록</button>
            </div>
            ${repliesHtml}
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="cmt-newform">
        <input type="text" class="cmt-new-name" placeholder="닉네임 (비우면 익명)" value="${draftName||''}">
        <textarea class="cmt-new-text" placeholder="댓글을 남겨보세요 (로그인 없이 누구나 작성 가능)">${draftText||''}</textarea>
        <button class="btn btn-primary" id="cmt-submit">댓글 등록</button>
      </div>

      <div class="cmt-toolbar">
        <span class="cmt-count">댓글 ${totalCount.toLocaleString()}개</span>
        <div class="cmt-sort">
          <button class="${sort==='popular'?'active':''}" data-sort="popular">인기순</button>
          <button class="${sort==='recent'?'active':''}" data-sort="recent">최신순</button>
        </div>
      </div>

      ${best.length ? `
        <div class="cmt-best-block">
          ${best.map(c=>commentHtml(c, true)).join('')}
        </div>
        <div class="cmt-divider"></div>
      ` : ''}

      <div class="cmt-list">
        ${sorted.map(c=>commentHtml(c, false)).join('')}
      </div>
    `;

    // ---- 이벤트 바인딩 ----
    root.querySelectorAll('[data-sort]').forEach(btn=>{
      btn.onclick = () => { state.sort = btn.dataset.sort; render(root, state); };
    });

    root.querySelectorAll('[data-like]').forEach(btn=>{
      btn.onclick = () => {
        const id = btn.dataset.like;
        const target = findComment(comments, id);
        if(target){
          target._liked = !target._liked;
          target.likes += target._liked ? 1 : -1;
          render(root, state);
        }
      };
    });

    root.querySelectorAll('[data-toggle]').forEach(el=>{
      el.onclick = () => {
        const id = el.dataset.toggle;
        if(state.openReplies.has(id)) state.openReplies.delete(id);
        else state.openReplies.add(id);
        render(root, state);
      };
    });

    root.querySelectorAll('[data-reply]').forEach(btn=>{
      btn.onclick = () => {
        const box = root.querySelector('#rf-'+btn.dataset.reply);
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
      };
    });

    root.querySelectorAll('[data-submit-reply]').forEach(btn=>{
      btn.onclick = () => {
        const id = btn.dataset.submitReply;
        const box = root.querySelector('#rf-'+id);
        const nameEl = box.querySelector('.cmt-reply-name');
        const textEl = box.querySelector('.cmt-reply-text');
        const text = textEl.value.trim();
        if(!text) return;
        const target = findComment(comments, id);
        target.replies.push({
          id: id+'-r'+Date.now(),
          name: nameEl.value.trim() || '익명',
          text,
          likes: 0,
          date: new Date(),
        });
        state.openReplies.add(id);
        render(root, state);
      };
    });

    const submitBtn = root.querySelector('#cmt-submit');
    if(submitBtn){
      submitBtn.onclick = () => {
        const nameEl = root.querySelector('.cmt-new-name');
        const textEl = root.querySelector('.cmt-new-text');
        const text = textEl.value.trim();
        if(!text) return;
        comments.unshift({
          id: 'c-new-'+Date.now(),
          name: nameEl.value.trim() || '익명',
          text,
          likes: 0,
          date: new Date(),
          replies: [],
        });
        state.name = '';
        state.text = '';
        render(root, state);
      };
    }
  }

  function findComment(comments, id){
    for(const c of comments){
      if(c.id === id) return c;
      const r = c.replies.find(x=>x.id===id);
      if(r) return r;
    }
    return null;
  }

  window.initCommentSection = function(containerId, opts){
    const root = document.getElementById(containerId);
    if(!root) return;
    const comments = genComments(opts.seed || 1, opts.count || 20, opts.epLabel || '이번 화');
    const state = { comments, sort:'popular', openReplies:new Set() };
    render(root, state);
  };

})();

/* ==========================================================================
   검은 장미는 피를 사랑한다 — 로그인 없는 댓글 위젯
   서버가 없는 정적 사이트라, 새로 남긴 댓글은 "이 브라우저에서만" 보입니다.
   (새로고침하면 시드 댓글로 초기화됩니다. 실제로 방문자끼리 댓글을 공유하려면
    Cloudflare Pages Functions + KV 같은 백엔드가 필요합니다.)
   ========================================================================== */

(function(){

  // ---- 시드용 고정 랜덤 (매번 새로고침해도 같은 결과가 나오도록) ----
  function mulberry32(seed){
    return function(){
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(rand, arr){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(rand()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // 중복 없이 뽑다가 다 떨어지면 다시 섞어서 재사용
  function makeDrawer(rand, pool){
    let queue = shuffle(rand, pool);
    let idx = 0;
    return function(){
      if(idx >= queue.length){ queue = shuffle(rand, pool); idx = 0; }
      return queue[idx++];
    };
  }

  const NICKS = [
    "장미덕후","도겸당원","서준최애","비서실1인","집착BL러버","까망고양이","레드로즈","우디향중독",
    "밤샘완독러","야근각","이불킥중","심장못참겠다","사이다중독","고구마먹는중","눈물버튼","떡밥헌터",
    "회귀중","완결까지가자","일단정주행","이거실화냐","다음화기다림","혈압상승중","팬아트준비중",
    "부회장님팬클럽","비서준생","도겸이바라기","서준이지킴이","월요병치료제","불면증유발자","심쿵주의",
    "정주행완료","1화부터정주행","알람맞춰놓음","연참좋아","작가님사랑해요","독자A","독자B","익명의독자",
    "지나가던독자","떡밥수집가","이야기중독","BL홀릭","로맨스홀릭","한입만","궁금해미치겠다","우산씬못잊음",
    "모찌바라기","말티즈덕후","손목잡힌사람","내사람하고싶다","저도직속가고파","퇴근하고싶은비서",
    "출근길정주행","점심시간정주행","화장실에서읽음","팀장님눈치","알림설정완료","이거보다지각함",
  ];

  // ---- 화 상관없이 쓸 수 있는 범용 리액션 ----
  const TOP_GENERIC = [
    "미쳤다 진짜... 이 부분 보고 심장 나갔어요",
    "작가님 다음화 언제 나와요 저 오늘 못 자요 ㅠㅠ",
    "윤도겸 캐릭터 미쳤다 진짜 이런 남자 어디 없나요 현실에",
    "한서준 반응 하나하나가 너무 현실적이라 몰입 미쳤음",
    "회사에서 몰래 보다가 혼자 웃어서 옆자리 동료가 이상하게 봄",
    "이거 완결까지 얼마나 남았어요 벌써 조마조마함",
    "작가님 필력 미쳤어요 진짜 웹소설계의 보물 발견함",
    "정주행하다가 여기까지 왔는데 다음화 없어서 지금 답답해 죽음",
    "이 소설 보다가 일이 손에 안 잡혀요 큰일났다 진짜로",
    "친구한테 추천했다가 같이 폐인 됨 책임지세요",
    "이런 장르 진짜 오랜만에 제대로 만났다 사장님 감사합니다",
    "회귀도 아니고 빙의도 아닌데 왜 이렇게까지 몰입되는거지",
    "진짜 오랜만에 정주행하면서 소리내서 헉 소리냄 이거 실화냐고",
    "저 지금 세 시간째 이 소설만 보고 있어요 정신차려야하는데",
    "댓글 눈팅만 하다가 도저히 못참고 남깁니다 너무 좋아요",
    "이거 웹툰화 안 되나요 제가 만화로도 봐야겠어요",
    "작가님 통장에 별풍선 쏘고싶은데 여기선 못쏘니까 댓글로 대신함",
    "이 정도면 유료 결제각인데 다음화 빨리 풀렸으면 좋겠다",
    "새벽 세시에 읽는 사람 여기 접니다 자야하는데 못 끊음",
    "심장아 부탁이니까 진정 좀 해줘 이러다 나 쓰러짐",
  ];

  const MID_GENERIC = [
    "재밌게 보고 있어요 다음화 기다릴게요",
    "필력 좋으시네요 앞으로도 기대할게요",
    "캐릭터들 매력 있어서 계속 보게 되네요",
    "요즘 이 소설 보는 재미로 살아요 진짜",
    "전개 속도 딱 좋은 것 같아요 안 늘어지고",
    "문장이 깔끔해서 술술 읽혀요",
    "설정이 신선해서 좋았습니다",
    "댓글 눈팅만 하다가 처음 남겨봐요 재밌어요",
    "다음화 언제 올라오나요 알림 신청했어요",
    "몰입감 좋아서 시간 가는 줄 몰랐어요",
    "두 사람 케미 좋네요 응원합니다",
    "표지도 예쁘고 내용도 좋아요",
    "이런 클리셰 은근 좋아하는데 잘 살리시네요",
    "작가님 다른 작품도 찾아볼게요",
    "생각보다 전개가 빨라서 좋아요 안 답답함",
    "주말에 정주행하려고 아껴뒀다가 결국 못 참고 봄",
    "디테일 살아있어서 좋아요 대충 안 쓰신게 느껴짐",
    "이 정도 텐션이면 저 완결까지 못 버틸 것 같은데요",
  ];

  const LOW_GENERIC = [
    "정주행 시작합니다",
    "재밌네요",
    "다음화 기다려요",
    "저장하고 나중에 정주행할게요",
    "북마크 완료",
    "괜찮은데요?",
    "흥미롭게 보고 있어요",
    "무료 회차 다 봤어요 아쉽다",
    "일단 팔로우 해놓을게요",
    "헐",
    "이거 실화냐",
    "미쳤다",
    "귀여워ㅠㅠ",
    "빨리 다음화",
    "심쿵",
  ];

  // ---- 화별 장면 저격 코멘트 ----
  const SCENE_POOLS = {
    "1화": [
      "회전문 앞에서 3분째 서있었다는 거 완전 나잖아",
      "한서준 룸메랑 카톡하는 거 너무 웃겨요 ㅋㅋㅋ 저런 친구 하나 있으면 좋겠다",
      "800대1 뚫은 사람이 사원증 앞에서 이렇게 쫄고 있다고?? 너무 귀여움",
      "복도에서 스치듯 본 것만으로 이렇게 조진다고요?? 저부터 조졌습니다",
      "나수아 캐릭터 너무 좋아요 저런 사수 만나고 싶다 진짜로",
      "정재현 저 여유 뭔가요 같은 신입인데 왜 혼자만 차분함",
      "부회장 지나갈 때 다들 벽에 붙는 거 실화냐고 회사가 무슨 훈련소냐",
      "이름이 뭐냐고 딱 한 마디에 벌써 심장 웅직임",
      "한서준 눈 내리깔고 인사 연습하는 거 상상하니까 너무 짠하면서 웃김",
    ],
    "2화": [
      "밥은. 이 두 글자에 제가 왜 설레야 하는 건가요",
      "내 사람이 굶는 건 못 봐서 이 대사 캡처해서 저장했습니다",
      "부회장 자리에서 야식 챙겨주는 상사 어디 없나요 진지하게 구직 중",
      "이름 두 번 확인했다는 거 실화냐 소름 돋았어",
      "실수 봐준 거 아니라면서 화낸 거 아니야 이 갭 미쳤다",
      "나수아 눈 커지는 거 상상되네요 저도 같이 놀람",
      "룸메 카톡 답장 늦게 온 거 개웃김 ㅋㅋㅋ 자냐 이거 완전 국룰",
      "새벽 한시 야식 남기고 간 거 왜 이렇게 짠하지",
    ],
    "3화": [
      "손목 잡는 장면 세 번째 다시보기 중입니다",
      "타라고 했다 이 대사 왜 이렇게 설레는 거야 진짜",
      "싫다는 말은 안 듣는다 이거 완전 집착남 클리셰인데 왜 좋지",
      "우산 씬 뻔한 클리셰인데 심장은 왜 뛰는 걸까요",
      "내일부터 직속으로 옮기라니 회사에서 저러면 신고감인데 소설이라 다행",
      "차 문 닫히는 소리에 저도 같이 놀람 ㅋㅋㅋ",
      "카톡으로 미쳤냐 축하해야되냐 도망쳐야되냐 이 반응 완전 내 생각이랑 똑같음",
      "빗소리 묘사 좋아서 진짜 비 오는 날 읽는 느낌났어요",
    ],
    "IF 외전": [
      "모찌 파트 너무 힐링돼요 강아지 도겸이 개 귀여움",
      "이름이 즉흥으로 모찌라니 ㅋㅋㅋ 감성 1도 없는 인간인 줄 알았는데",
      "알아듣는 척은 이 대사에서 웃참 실패했습니다",
      "다른 시간선인데 왜 이렇게 마음이 아프지 본편에서는 못 만난다니",
      "코트로 감싸안는 장면 너무 다정해서 심장 아픔",
      "체온 낮은 사람이 강아지 안고 따뜻하다고 느끼는 거 뭔가 상징적이라 좋았어요",
      "이 세계선의 도겸이도 너무 좋다 한서준 자리 하나 비워두고 싶음",
    ],
  };

  // ---- 이미 완결까지 결제해서 다 본 독자들의 스포일러성 리액션 ----
  // (지금 사이트에서 못 읽는 4화 이후 내용도, 완독한 다른 독자들 입장에선 이미 다 본 이야기)
  const FUTURE_HYPE = [
    "완결까지 정주행한 사람인데 감금 편에서 진짜 숨 못 쉬었어요",
    "납치 편 이후로 안 무서운 화가 없음 각오하고 보세요",
    "정략결혼 파트 나올 때 스트레스 받았는데 그만큼 재밌었어요",
    "고백 씬 보고 그날 밤 잠 못 잤습니다 진짜로",
    "구원 편에서 펑펑 울었어요 이거 티슈 필수",
    "에필로그까지 다 보고 왔는데 여운이 아직도 안 가심",
    "후계자 발표 이후로 전개 미쳤음 마음 단단히 먹고 보세요",
    "완결 보고 왔는데 결말 진짜 만족스러웠어요 후회 없는 완독",
    "승계 전쟁 파트 손에 땀 쥐고 봤습니다",
    "폭로 편 이후로 못 멈추고 정주행함 밤새는 거 그다지 추천은 안 함",
    "소문 편부터 심상치 않더니 역시나였어요",
    "마지막 이사회 그 장면 아직도 소름 돋음",
    "배신 편에서 저도 같이 배신감 느꼈어요 이입 미쳤음",
    "완독한 입장에서 말하자면 지금 이 초반부가 제일 순한맛입니다 각오하세요",
    "아직 무료 회차만 보고 계신 분 지금 여기서 이 정도면 뒤에 가서 어쩌시려고요",
    "저는 결제하고 하루만에 다 봤어요 후회 1도 없습니다",
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
    "진짜 너무 좋았어요 이 부분",
    "저도 그거 보고 소름 돋았어요",
    "님도 그 생각 했구나 저만 그런 줄",
    "이 댓글 보고 다시 읽으러 갑니다",
    "정확해요 제 마음을 대신 써주셨네요",
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

    // 전체 리뷰(이 소설)라면 모든 화의 장면 코멘트를 다 섞어 쓴다
    let scenePool = [];
    if(epLabel === '이 소설'){
      // 독자들은 IF 외전(메타적 요소)의 존재를 모르므로 리뷰에 섞지 않는다
      Object.entries(SCENE_POOLS).forEach(([key, arr]) => {
        if(key !== 'IF 외전') scenePool.push(...arr);
      });
    } else {
      scenePool = SCENE_POOLS[epLabel] || [];
    }

    const topPool = [...TOP_GENERIC, ...FUTURE_HYPE, ...scenePool];
    const drawTop = makeDrawer(rand, topPool);
    const drawMid = makeDrawer(rand, MID_GENERIC);
    const drawLow = makeDrawer(rand, LOW_GENERIC);
    const drawReply = makeDrawer(rand, REPLY_TEMPLATES);
    const drawNick = makeDrawer(rand, NICKS);

    function uniqueNick(){
      let nick = drawNick();
      let base = nick, n = 2;
      while(usedNicks.has(nick)){ nick = base + n; n++; }
      usedNicks.add(nick);
      return nick;
    }

    for(let i=0;i<count;i++){
      const nick = uniqueNick();

      const tier = rand();
      let likes, text;
      if(tier < 0.1){
        likes = Math.floor(120 + rand()*780);
        text = drawTop();
      } else if(tier < 0.42){
        likes = Math.floor(8 + rand()*60);
        text = drawMid();
      } else {
        likes = Math.floor(rand()*10);
        text = drawLow();
      }

      const daysAgo = rand()*30;
      const date = new Date(nowMs - daysAgo*86400000 - rand()*3600000);

      const replies = [];
      if(rand() < 0.18){
        const rc = 1 + Math.floor(rand()*3);
        for(let r=0;r<rc;r++){
          const rn = uniqueNick();
          replies.push({
            id: `${i}-r${r}`,
            name: rn,
            text: drawReply(),
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
    const { comments, sort } = state;

    const sorted = [...comments].sort((a,b) => {
      if(sort === 'popular') return b.likes - a.likes || (b.date - a.date);
      return b.date - a.date;
    });

    // 베스트 댓글은 "인기순"일 때만 상단에 고정 노출. 최신순에서는 노출하지 않음.
    const best = sort === 'popular'
      ? [...comments].sort((a,b)=>b.likes-a.likes).slice(0,3).filter(c=>c.likes>0)
      : [];

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
        <input type="text" class="cmt-new-name" placeholder="닉네임 (비우면 익명)" value="${state.name||''}">
        <textarea class="cmt-new-text" placeholder="댓글을 남겨보세요 (로그인 없이 누구나 작성 가능)">${state.text||''}</textarea>
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
    const comments = genComments(opts.seed || 1, opts.count || 20, opts.epLabel || '이 소설');
    const state = { comments, sort:'popular', openReplies:new Set() };
    render(root, state);
  };

})();

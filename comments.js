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

  // ---- 화 상관없이 쓸 수 있는 범용 리액션 (댓글마다 그 내용에 실제로 대답하는 답글을 붙임) ----
  const TOP_GENERIC = [
    { text:"미쳤다 진짜... 이 부분 보고 심장 나갔어요",
      replies:["심장 몇 개 필요하신 분 여기 계신가요 저도 나갔어요","저는 아예 못 돌아오고 있어요 지금"] },
    { text:"작가님 다음화 언제 나와요 저 오늘 못 자요 ㅠㅠ",
      replies:["화목 연재라던데 저도 화요일마다 알람 맞춰놔요","저는 그냥 눈 뜨고 밤샘 확정임"] },
    { text:"윤도겸 캐릭터 미쳤다 진짜 이런 남자 어디 없나요 현실에",
      replies:["없어서 소설로 채우는 겁니다 냉정하게 받아들이세요","저 방금 소개팅남이랑 비교하다가 현타옴"] },
    { text:"한서준 반응 하나하나가 너무 현실적이라 몰입 미쳤음",
      replies:["맞아요 저였어도 딱 저렇게 굳었을 듯","현실적이라 더 짠함 신입 때 생각남"] },
    { text:"회사에서 몰래 보다가 혼자 웃어서 옆자리 동료가 이상하게 봄",
      replies:["저는 팀장님한테 딱 걸릴 뻔 했어요","이거 완전 산재각인데 웃참 실패는 어쩔수없죠"] },
    { text:"이거 완결까지 얼마나 남았어요 벌써 조마조마함",
      replies:["회차 목록 보니까 54화까지 있던데요","저도 세어보다가 그냥 마음 비웠어요"] },
    { text:"작가님 필력 미쳤어요 진짜 웹소설계의 보물 발견함",
      replies:["이거 진짜 초반부인데 이 정도면 뒤는 어쩌려고요","보물이라는 말에 200% 동의합니다"] },
    { text:"정주행하다가 여기까지 왔는데 다음화 없어서 지금 답답해 죽음",
      replies:["저도 방금 같은 표정으로 화면 붙잡고 있어요","여기 막힌 사람 여기 한 명 더요"] },
    { text:"친구한테 추천했다가 같이 폐인 됨 책임지세요",
      replies:["저도 룸메 끌어들였다가 둘이 밤새는 중입니다","전염성 미쳤어요 이 소설"] },
    { text:"진짜 오랜만에 정주행하면서 소리내서 헉 소리냄 이거 실화냐고",
      replies:["저는 헉을 넘어서 악 소리까지 냈어요","옆에서 놀라서 무슨일이냐고 물어봄 ㅋㅋㅋ"] },
    { text:"저 지금 세 시간째 이 소설만 보고 있어요 정신차려야하는데",
      replies:["세 시간이면 양호한 겁니다 저는 다섯 시간째","정신 차리지 마세요 여기 다 그럽니다"] },
    { text:"이거 웹툰화 안 되나요 제가 만화로도 봐야겠어요",
      replies:["저도 표지 보고 바로 그 생각했어요","웹툰 되면 진짜 인생작 갱신할듯"] },
    { text:"이 정도면 유료 결제각인데 다음화 빨리 풀렸으면 좋겠다",
      replies:["결제 각 확정입니다 지갑 열 준비 됐어요","저는 이미 결제 버튼에 손 올려놨어요"] },
    { text:"새벽 세시에 읽는 사람 여기 접인다 자야하는데 못 끊음",
      replies:["세시요? 저는 지금 다섯시입니다","여기 불면증 유발자 소설 인증합니다"] },
  ];

  const MID_GENERIC = [
    { text:"재밌게 보고 있어요 다음화 기다릴게요",
      replies:["저도 오늘 새 화 나올까 기대하고 있어요"] },
    { text:"필력 좋으시네요 앞으로도 기대할게요",
      replies:["그니까요 문장력 진짜 좋으신 듯"] },
    { text:"캐릭터들 매력 있어서 계속 보게 되네요",
      replies:["조연들까지 다 매력있어서 신기해요"] },
    { text:"전개 속도 딱 좋은 것 같아요 안 늘어지고",
      replies:["맞아요 답답할 틈이 없어서 좋아요"] },
    { text:"문장이 깔끔해서 술술 읽혀요",
      replies:["그니까요 몇 화씩 순삭임"] },
    { text:"설정이 신선해서 좋았습니다",
      replies:["재벌+비서 조합 뻔한데 안 뻔하게 잘 풀어내시네요"] },
    { text:"다음화 언제 올라오나요 알림 신청했어요",
      replies:["저도 알림 켜놨는데 벌써 기다려지네요"] },
    { text:"몰입감 좋아서 시간 가는 줄 몰랐어요",
      replies:["저도 정신 차려보니 한 시간 지나있었어요"] },
    { text:"두 사람 케미 좋네요 응원합니다",
      replies:["케미 실화냐 벌써 응원하고 있어요"] },
    { text:"이런 클리셰 은근 좋아하는데 잘 살리시네요",
      replies:["클리셰 장인이신듯 이 정도면"] },
    { text:"주말에 정주행하려고 아껴뒀다가 결국 못 참고 봄",
      replies:["아껴두는 거 절대 불가능하죠 저도 그럼"] },
    { text:"디테일 살아있어서 좋아요 대충 안 쓰신게 느껴짐",
      replies:["맞아요 향이나 체온 묘사까지 신경쓰신 게 보여요"] },
  ];

  const LOW_GENERIC = ["정주행 시작합니다","재밌네요","다음화 기다려요","저장하고 나중에 정주행할게요","북마크 완료","흥미롭게 보고 있어요","무료 회차 다 봤어요 아쉽다","헐","이거 실화냐","미쳤다","귀여워ㅠㅠ","빨리 다음화","심쿵"];
  const LOW_FALLBACK_REPLIES = ["ㅋㅋㅋ 저도","완전 공감","인정"];

  // ---- 화별 장면 저격 코멘트 ----
  const SCENE_POOLS = {
    "1화": [
      { text:"회전문 앞에서 3분째 서있었다는 거 완전 나잖아",
        replies:["저는 5분도 서있었을 듯 회전문 트라우마 있음","면접장 앞에서 저도 저랬어요"] },
      { text:"한서준 룸메랑 카톡하는 거 너무 웃겨요 ㅋㅋㅋ 저런 친구 하나 있으면 좋겠다",
        replies:["늦으면 전설된다는 말 너무 웃김","제 친구도 딱 저렇게 팩폭함"] },
      { text:"800대1 뚫은 사람이 사원증 앞에서 이렇게 쫄고 있다고?? 너무 귀여움",
        replies:["스펙이랑 멘탈은 별개죠 저도 이해함","면접 붙어도 첫날은 다 저래요"] },
      { text:"나수아 캐릭터 너무 좋아요 저런 사수 만나고 싶다 진짜로",
        replies:["저도 취준생 시절 저런 선배 간절했어요","나수아 스핀오프 나왔으면"] },
      { text:"정재현 저 여유 뭔가요 같은 신입인데 왜 혼자만 차분함",
        replies:["저 사람 뭔가 사연 있을 것 같은 텐션임","동기인데 차이 실화냐 저도 놀람"] },
      { text:"부회장 지나갈 때 다들 벽에 붙는 거 실화냐고 회사가 무슨 훈련소냐",
        replies:["저희 회사 대표님도 비슷함 ㅋㅋㅋ","묘사가 너무 생생해서 웃겼어요"] },
    ],
    "2화": [
      { text:"밥은. 이 두 글자에 제가 왜 설레야 하는 건가요",
        replies:["단어 두 개로 이 정도 설레게 하는 거 반칙임","저도 이 대사에서 숨멈췄어요"] },
      { text:"내 사람이 굶는 건 못 봐서 이 대사 캡처해서 저장했습니다",
        replies:["저는 배경화면으로 해놨어요 이 대사","이 대사 하나로 이 소설 계속 볼 이유 생김"] },
      { text:"부회장 자리에서 야식 챙겨주는 상사 어디 없나요 진지하게 구직 중",
        replies:["채용공고 뜨면 저도 지원하겠습니다","현실에 없어서 더 애타는 캐릭터임"] },
      { text:"이름 두 번 확인했다는 거 실화냐 소름 돋았어",
        replies:["저도 그 대목에서 소름 쫙 돋았어요","이런 사소한 디테일이 제일 무서움"] },
      { text:"실수 봐준 거 아니라면서 화낸 거 아니야 이 갭 미쳤다",
        replies:["츤데레의 정석이네요 진짜","이 갭 때문에 계속 보게 됨"] },
      { text:"룸메 카톡 답장 늦게 온 거 개웃김 ㅋㅋㅋ 자냐 이거 완전 국룰",
        replies:["다들 이런 친구 한 명씩 있죠 ㅋㅋㅋ","현실 카톡 그 자체라 웃겼어요"] },
    ],
    "3화": [
      { text:"손목 잡는 장면 세 번째 다시보기 중입니다",
        replies:["저는 다섯 번째인데 아직도 심장 떨림","이 장면 짤로 만들어서 저장했어요"] },
      { text:"타라고 했다 이 대사 왜 이렇게 설레는 거야 진짜",
        replies:["짧은 대사가 제일 무섭더라고요 저도 당함","반말 명령체 이렇게 설렌 적 처음"] },
      { text:"싫다는 말은 안 듣는다 이거 완전 집착남 클리셰인데 왜 좋지",
        replies:["클리셰인 거 아는데 못 끊음 저도","집착 유전자가 반응함 어쩔 수 없음"] },
      { text:"우산 씬 뻔한 클리셰인데 심장은 왜 뛰는 걸까요",
        replies:["뻔한데 또 당하는 게 클리셰의 힘이죠","저는 우산 씬 나올 때마다 무조건 설렘"] },
      { text:"카톡으로 미쳤냐 축하해야되냐 도망쳐야되냐 이 반응 완전 내 생각이랑 똑같음",
        replies:["저도 읽으면서 똑같이 생각했어요 ㅋㅋㅋ","이 반응 너무 현실적이라 웃겼어요"] },
      { text:"빗소리 묘사 좋아서 진짜 비 오는 날 읽는 느낌났어요",
        replies:["저도 창밖 비 오는데 타이밍 미쳤다 생각했어요","분위기 묘사 진짜 섬세하네요"] },
    ],
  };

  // ---- 이미 완결까지 결제해서 다 본 독자들의 스포일러성 리액션 ----
  // (지금 사이트에서 못 읽는 4화 이후 내용도, 완독한 다른 독자들 입장에선 이미 다 본 이야기)
  const FUTURE_HYPE = [
    { text:"완결까지 정주행한 사람인데 감금 편에서 진짜 숨 못 쉬었어요",
      replies:["저도 그 편 보고 하루 종일 멍했어요","감금 편 얘기만 나오면 다들 숙연해지죠"] },
    { text:"납치 편 이후로 안 무서운 화가 없음 각오하고 보세요",
      replies:["저 그 편 보고 심장약 검색했습니다","각오하라는 말 진심으로 믿으세요"] },
    { text:"고백 씬 보고 그날 밤 잠 못 잤습니다 진짜로",
      replies:["저는 다음날 출근도 못할 뻔 했어요","그 장면 얘기만 나와도 다시 설렘"] },
    { text:"구원 편에서 펑펑 울었어요 이거 티슈 필수",
      replies:["저는 티슈 한 통 다 씀 안 과장임","이 댓글 보고도 눈물 남 미리 알림 감사"] },
    { text:"완독한 입장에서 말하자면 지금 이 초반부가 제일 순한맛입니다 각오하세요",
      replies:["순한맛이라는 말에 벌써 무섭네요","마음의 준비를 미리 해야겠어요"] },
    { text:"아직 무료 회차만 보고 계신 분 지금 여기서 이 정도면 뒤에 가서 어쩌시려고요",
      replies:["저도 지금 이 정도로 벅찬데 걱정되네요","결제 안 하고 배기는 사람 있나요 이 정도면"] },
    { text:"승계 전쟁 파트 손에 땀 쥐고 봤습니다",
      replies:["저도 그 편 보면서 손톱 다 뜯었어요","제목만 들어도 긴장되네요 벌써"] },
    { text:"저는 결제하고 하루만에 다 봤어요 후회 1도 없습니다",
      replies:["하루만에는 못 믿겠는데 사실이죠?","저도 결제 각 재는 중입니다 후기 감사해요"] },
  ];



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
      let likes, text, tierName, replyPoolFor;
      if(tier < 0.1){
        likes = Math.floor(120 + rand()*780);
        const entry = drawTop();
        text = entry.text;
        replyPoolFor = entry.replies || [];
        tierName = 'top'; // 구체적인 장면/대사 언급 댓글
      } else if(tier < 0.42){
        likes = Math.floor(8 + rand()*60);
        const entry = drawMid();
        text = entry.text;
        replyPoolFor = entry.replies || [];
        tierName = 'mid'; // 일반적인 응원/기대 댓글
      } else {
        likes = Math.floor(rand()*10);
        text = drawLow();
        replyPoolFor = LOW_FALLBACK_REPLIES;
        tierName = 'low'; // 한두 마디 짧은 반응
      }

      const daysAgo = rand()*30;
      const date = new Date(nowMs - daysAgo*86400000 - rand()*3600000);

      // 주접/장면 저격 댓글일수록 답글 많이 붙고, 밋밋한 댓글엔 거의 안 붙는다
      // 답글은 이 댓글 전용으로 미리 붙여둔 것만 쓰므로 내용이 항상 원댓글과 맞물림
      const replyChance = tierName === 'top' ? 0.55 : tierName === 'mid' ? 0.16 : 0.02;
      const replies = [];
      if(replyPoolFor.length && rand() < replyChance){
        const rc = Math.min(1 + Math.floor(rand()*replyPoolFor.length), replyPoolFor.length);
        const localTexts = shuffle(rand, replyPoolFor).slice(0, rc);
        for(let r=0;r<rc;r++){
          const rn = uniqueNick();
          replies.push({
            id: `${i}-r${r}`,
            name: rn,
            text: localTexts[r],
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

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
  // 단순 감탄사 대신, 문장력·캐릭터 심리·설정에 대한 구체적인 코멘트 위주로 구성
  const TOP_GENERIC = [
    { text:"윤도겸이 화낼수록 목소리가 차분해진다는 설정 진짜 무섭다... 감정을 숨기는 게 아니라 아예 다른 사람이 되는 느낌",
      replies:["그니까요 화내는 사람보다 저게 더 무서움","냉정함이 무기인 캐릭터라 더 매력있어요"] },
    { text:"한서준이 계속 눈치 보고 선 지키려는 게 짠한데, 그 와중에도 할 말은 하는 게 좋음. 그냥 순한 수 캐릭터 아니라서 좋아요",
      replies:["맞아요 겁먹었으면서도 할 말 하는 거 매력포인트","수동적이지 않아서 몰입도가 다름"] },
    { text:"신입 비서가 부회장한테 이 정도로 관심 받는 게 비현실적이어야 하는데, 캐릭터 서사가 탄탄해서 그런지 설득이 됨",
      replies:["앞뒤 서사가 있으니까 안 뜬금없더라고요","이래서 클리셰도 잘 쓰면 힘이 생기나봐요"] },
    { text:"회사에서 몰래 보다가 혼자 웃어서 옆자리 동료가 이상하게 봄. 이 소설 특유의 텐션이 있음",
      replies:["저는 팀장님한테 딱 걸릴 뻔 했어요","웃참 안 되는 화가 계속 나와서 문제"] },
    { text:"이 작가님 대사 치는 타이밍이 진짜 좋다. 정보량 많은 문장 안 쓰고 짧은 대사로 감정 밀도를 확 올림",
      replies:["문장 길이 조절 진짜 잘하시는 듯","짧은 대사 하나로 분위기 바뀌는 거 신기함"] },
    { text:"재벌 후계자물인데 권력 다툼보다 캐릭터 감정선에 더 집중하는 느낌이라 좋아요. 클리셰를 반복하지 않고 잘 비틈",
      replies:["설정은 익숙한데 풀어내는 방식이 다름","이래서 계속 보게 되나 봐요"] },
    { text:"정주행하다가 여기까지 왔는데 다음화 없어서 지금 답답해 죽음. 이 텐션으로 3화씩 끊는 거 너무함",
      replies:["저도 방금 같은 표정으로 화면 붙잡고 있어요","끊는 타이밍이 다 계산된 것 같음"] },
    { text:"한서준 시점 위주로 서술되는데 윤도겸 속마음이 하나도 안 나와서 더 궁금해짐. 이 정보 비대칭이 몰입 포인트인듯",
      replies:["저도 그 생각했어요 도겸이 시점 외전 나왔으면","독자도 한서준이랑 같이 헷갈리게 만드는 구성"] },
    { text:"인물 소개에 뻔한 서술 안 하고 행동으로 성격을 보여주는 게 좋음. 설명충 나레이션이 없어서 술술 읽힘",
      replies:["맞아요 대사랑 행동으로 다 설명되네요","친절하게 다 알려주는 소설보다 이게 더 좋음"] },
    { text:"이 정도면 유료 결제각인데 다음화 빨리 풀렸으면 좋겠다. 초반 세 화 만으로 벌써 확신이 옴",
      replies:["결제 각 확정입니다 지갑 열 준비 됐어요","3화까지 이 정도면 안 볼 이유가 없죠"] },
    { text:"새벽 세시에 정주행하다가 문득 든 생각인데, 이 소설 클리셰 쓰는 방식이 옛날 웹소설이랑 결이 다름. 정서가 요즘 감성임",
      replies:["세시요? 저는 지금 다섯시입니다","동의해요 문체가 확실히 요즘 느낌"] },
    { text:"부회장 캐릭터가 집착적인데 그게 폭력적으로 안 느껴지게 쓰는 균형이 좋음. 선 넘기 직전까지만 밀어붙이는 느낌",
      replies:["그 균형 잡기 진짜 어려운 건데 잘하시네요","선 넘을 듯 말 듯한 텐션이 킬포임"] },
  ];

  const MID_GENERIC = [
    { text:"전개 속도가 딱 좋아요. 3화 만에 관계 변화 계기를 다 만들어놓고도 안 억지스러움",
      replies:["맞아요 성급하지 않으면서 빠른 느낌"] },
    { text:"문장이 깔끔해서 술술 읽혀요. 수식어 과하지 않고 필요한 곳에만 감정 실어서 씀",
      replies:["그니까요 몇 화씩 순삭임"] },
    { text:"재벌+비서라는 뻔한 설정인데 안 뻔하게 풀어내시네요. 인물 관계에 힘을 준 게 느껴져요",
      replies:["클리셰 장인이신듯 이 정도면"] },
    { text:"조연 캐릭터들(나수아, 정재현)도 그냥 정보 전달용이 아니라 나름의 매력이 있어서 좋아요",
      replies:["조연들까지 다 살아있어서 신기해요"] },
    { text:"두 사람 사이 온도차가 잘 느껴져요. 한 쪽은 계속 당황하고 한 쪽은 담담한데 그게 안 어색함",
      replies:["케미 실화냐 벌써 응원하고 있어요"] },
    { text:"디테일이 살아있어서 좋아요. 체온이나 향 같은 신체적 묘사가 반복되면서 캐릭터성으로 쌓이는 느낌",
      replies:["맞아요 그런 디테일이 쌓이니까 캐릭터가 입체적으로 느껴져요"] },
    { text:"몰입감 좋아서 시간 가는 줄 몰랐어요. 장면 전환이 매끄러워서 안 끊기고 읽힘",
      replies:["저도 정신 차려보니 한 시간 지나있었어요"] },
    { text:"주말에 정주행하려고 아껴뒀다가 결국 못 참고 봄. 자제력 테스트하는 소설임",
      replies:["아껴두는 거 절대 불가능하죠 저도 그럼"] },
    { text:"인물들 대사 톤이 서로 다 달라서 누가 말하는지 이름 안 봐도 구분됨. 이런 거 은근 어려운 건데",
      replies:["오 진짜 그러네요 톤 구분되는 거 신기함"] },
    { text:"이 정도 텐션이면 저 완결까지 못 버틸 것 같은데요. 유료 전환되는 지점 타이밍도 절묘함",
      replies:["딱 궁금할 때 끊어서 얄미울 정도임"] },
  ];

  // 아주 짧은 반응도 아무 말 대잔치가 아니라 최소한 뭘 보고 하는 말인지는 드러나게
  const LOW_GENERIC = [
    "3화까지 정주행 완료, 다음화 기다립니다",
    "표지 톤이랑 내용 분위기가 잘 맞아서 좋아요",
    "무료 회차 다 봤는데 딱 궁금할 때 끊겨서 아쉽다",
    "북마크 완료, 다음화 뜨면 바로 볼게요",
    "설정 신선해서 팔로우 해놓습니다",
    "우산 씬 여운 아직도 안 가심",
    "한서준 캐릭터에 이입 완전 됨",
    "윤도겸 대사 톤 진짜 좋아요",
  ];
  const LOW_FALLBACK_REPLIES = ["저도 같은 마음입니다","그 부분 저도 인상적이었어요","공감하고 갑니다"];

  // ---- 화별 장면 저격 코멘트 ----
  const SCENE_POOLS = {
    "1화": [
      { text:"800대 1 뚫은 사람이 사원증 앞에서 쫄고 있는 거, 스펙이랑 멘탈은 별개라는 걸 잘 보여주는 디테일이라 좋았어요",
        replies:["스펙 좋아도 첫 출근은 다 떨리는 법이죠","이 대비가 캐릭터를 더 인간적으로 만드는듯"] },
      { text:"룸메랑 카톡 주고받는 장면으로 한서준 배경(지방 출신, 삼 년 준비)을 설명충 없이 자연스럽게 풀어낸 게 좋았어요",
        replies:["대사로 배경 설명하는 방식 좋더라고요","나레이션으로 안 풀고 대화로 풀어서 안 지루함"] },
      { text:"복도에서 다들 벽에 붙는 장면, 짧은데 그 회사 분위기랑 부회장 위상을 한 번에 보여줌",
        replies:["그 장면 하나로 설정 설명 끝난 느낌","저희 회사 대표님도 비슷함 ㅋㅋㅋ"] },
      { text:"나수아 캐릭터가 그냥 설명용 선배가 아니라 나름 유머 감각 있는 사람으로 그려져서 좋아요",
        replies:["저도 취준생 시절 저런 선배 간절했어요","나수아 시점 외전 나왔으면 좋겠어요"] },
      { text:"정재현이 같은 신입인데 유독 여유로운 거, 뭔가 다음 화에서 떡밥 회수될 것 같은 느낌적인 느낌",
        replies:["저도 뭔가 사연 있을 것 같다고 생각했어요","저 캐릭터 계속 신경쓰이네요"] },
    ],
    "2화": [
      { text:"‘밥은.’ 이 두 글자짜리 대사 하나로 캐릭터의 다정함과 무뚝뚝함을 동시에 보여주는 게 인상적이었어요",
        replies:["단어 두 개로 이 정도 밀도 내는 거 반칙임","저도 이 대사에서 숨멈췄어요"] },
      { text:"‘내 사람이 굶는 건 못 봐서’라는 대사, 소유욕이 느껴지면서도 다정함으로 포장되는 균형이 좋았어요",
        replies:["이 대사 하나로 캐릭터 성격이 확 잡히네요","소유욕과 다정함 사이 그 선이 킬포"] },
      { text:"실수는 봐준 거 아니라면서 화낸 거 아니라고 하는 그 갭. 말과 행동이 다른 게 캐릭터의 매력 포인트로 잘 작동함",
        replies:["츤데레의 정석이네요 진짜","이 갭 때문에 계속 보게 됨"] },
      { text:"이름을 두 번 확인했다는 설정, 사소한 디테일인데 그게 소문이 되어 퍼지는 전개가 자연스러웠어요",
        replies:["소문 퍼지는 속도감이 리얼해서 좋았어요","이런 사소한 디테일이 제일 무서움"] },
      { text:"새벽 한 시에 야식 남기고 조용히 가는 장면, 대사 없이도 감정이 전달돼서 좋았어요",
        replies:["말 없이 보여주는 연출이 더 와닿아요","이 장면 여운 길게 남더라고요"] },
    ],
    "3화": [
      { text:"우산 씬 자체는 클리셰인데, 그 전에 쌓인 작은 접점들(야식, 이름 확인) 덕분에 여기서 설득력이 생김",
        replies:["맞아요 갑자기 나온 게 아니라 쌓인 결과라 납득됨","클리셰인 거 아는데 빌드업이 좋아서 안 뻔함"] },
      { text:"‘타라고 했다’처럼 짧고 단정적인 대사가 캐릭터의 화법(짧고 간결)을 그대로 보여줘서 설정과 문체가 일치함",
        replies:["설정이랑 문체가 맞물리는 거 세심하네요","반말 명령체 이렇게 설렌 적 처음"] },
      { text:"‘싫다는 말은 안 듣는다’는 대사, 집착 클리셰인데 그 전까지 쌓인 서사 덕분에 무섭기보다 설레는 쪽으로 읽힘",
        replies:["빌드업 없이 나왔으면 무서웠을 대사인데 잘 눌러 담았어요","집착 코드를 잘 조절하는 작가님이네요"] },
      { text:"손목 잡는 장면에서 ‘낮은 체온’ 설정을 다시 상기시키는 거, 프로필 설정을 그냥 텍스트로 안 흘리고 계속 써먹는 게 좋음",
        replies:["설정 하나를 계속 활용하는 거 디테일 살아있음","체온 설정이 반복되면서 캐릭터성으로 굳어짐"] },
      { text:"3화 마무리가 다음화 결제를 유도하는 지점에서 딱 끊기는데, 그 타이밍이 얄미울 정도로 절묘함",
        replies:["작가님 상술 인정합니다 그래도 결제할 거임","이 타이밍에 끊는 거 진짜 능력자임"] },
    ],
  };

  // ---- 이미 완결까지 결제해서 다 본 독자들의 스포일러성 리액션 ----
  // (지금 사이트에서 못 읽는 4화 이후 내용도, 완독한 다른 독자들 입장에선 이미 다 본 이야기.
  //  구체적인 사건은 밝히지 않는 선에서, 완독자 특유의 여운/추천 톤으로 작성)
  const FUTURE_HYPE = [
    { text:"완결까지 다 본 입장에서 말하면, 감금 편부터는 두 사람 관계의 무게가 완전히 달라져요. 지금 초반부는 정말 도입일 뿐입니다",
      replies:["저도 그 편 보고 하루 종일 멍했어요","무게가 달라진다는 말이 벌써 무섭네요"] },
    { text:"납치 편 이후로 두 사람이 서로를 대하는 방식 자체가 바뀌는데, 그 변화 과정이 자연스러워서 억지스럽지 않았어요",
      replies:["급발진 안 하고 서서히 변하는 게 좋더라고요","각오하라는 말 진심으로 믿으세요"] },
    { text:"고백 장면까지 가는 과정이 길게 느껴지지 않았어요. 오히려 왜 이렇게 늦게 왔나 싶을 정도로 감정선이 탄탄하게 쌓여있음",
      replies:["감정선 쌓는 데 진짜 공들인 게 느껴져요","저는 다음날 출근도 못할 뻔 했어요"] },
    { text:"완독한 입장에서 말하자면, 지금 이 초반부가 관계의 '기준점' 역할을 해서 나중에 다시 읽으면 또 다른 느낌이에요",
      replies:["다시 읽을 이유가 하나 더 생기네요","초반부 복선이 나중에 회수되는 느낌 좋아함"] },
    { text:"승계 전쟁 파트는 로맨스보다 서스펜스에 가까운데, 그 텐션 전환이 자연스러워서 장르가 바뀐 느낌이 안 들었어요",
      replies:["로맨스랑 스릴러를 섞는 균형이 좋았다는 거죠","제목만 들어도 긴장되네요 벌써"] },
    { text:"결말까지 보고 나서 다시 1화를 읽으면 초반 대사 하나하나가 다르게 읽혀요. 복선 회수가 꼼꼼한 편이에요",
      replies:["이런 말 들으면 완독 후 재독 각 잡히네요","복선 회수 좋아하는 사람으로서 기대되네요"] },
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

    // 의미없는 한마디성 댓글(low) 비중을 낮추고, 구체적인 코멘트(top/mid) 비중을 높임
    for(let i=0;i<count;i++){
      const nick = uniqueNick();

      const tier = rand();
      let likes, text, tierName, replyPoolFor;
      if(tier < 0.22){
        likes = Math.floor(120 + rand()*780);
        const entry = drawTop();
        text = entry.text;
        replyPoolFor = entry.replies || [];
        tierName = 'top'; // 구체적인 분석/장면 언급 댓글
      } else if(tier < 0.75){
        likes = Math.floor(8 + rand()*60);
        const entry = drawMid();
        text = entry.text;
        replyPoolFor = entry.replies || [];
        tierName = 'mid'; // 구체적이되 조금 더 짧은 감상평
      } else {
        likes = Math.floor(rand()*10);
        text = drawLow();
        replyPoolFor = LOW_FALLBACK_REPLIES;
        tierName = 'low'; // 짧지만 최소한의 맥락은 있는 반응
      }

      const daysAgo = rand()*30;
      const date = new Date(nowMs - daysAgo*86400000 - rand()*3600000);

      // 장면 저격/분석형 댓글일수록 답글 많이 붙고, 짧은 댓글엔 거의 안 붙는다
      // 답글은 이 댓글 전용으로 미리 붙여둔 것만 쓰므로 내용이 항상 원댓글과 맞물림
      const replyChance = tierName === 'top' ? 0.55 : tierName === 'mid' ? 0.2 : 0.04;
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

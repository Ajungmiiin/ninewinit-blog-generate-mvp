export type GenerateBlogResponse = {
blog : BlogContent,
keywords : KeywordItem[],
socialContents : SocialContents,
imagePrompt : string;
}

export type BlogContent = {
    title : string;
    introduction : string;
    sections : {
        heading : string;
        content : string
    }[],
    conclusion : string;
}

export type KeywordCategory =       | "브랜드"
      | "상품"
      | "문제해결"
      | "차별성"
      | "신뢰"
      | "이벤트"
export type KeywordIntent = "정보탐색" | "비교검토" | "구매전환";
export type KeywordTrendLevel = '높음' | '중간' | '낮음';
export type KeywordCompetition =     '높음' | '중간' | '낮음'

export type KeywordItem = {
    keyword : string;
    intent : KeywordIntent,
    category : KeywordCategory;
    competition : KeywordCompetition;
    score : number;
    reason : string;
    trendLevel : KeywordTrendLevel
}

export type SocialContents = {
    twitter : string,
    instagram : string,
    threads : string
}
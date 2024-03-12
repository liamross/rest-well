import {NextRequest, NextResponse} from "next/server";

export const {GET, generateStaticParams, dynamicParams} = getObj();

function getObj() {
  return {
    dynamicParams: false,
    GET: (request: NextRequest, {params}: {params: {path: string[]}}) => {
      const {path} = params;
      return NextResponse.json({path});
    },
    generateStaticParams() {
      return [{path: ["a", "1"]}, {path: ["b", "[id]"]}, {path: ["c", "3"]}];
    },
  };
}

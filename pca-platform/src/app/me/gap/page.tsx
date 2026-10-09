import { redirect } from "next/navigation";

/**
 * 옛 주소.
 *
 * `/me/gap` 한 쪽에 지금 상태와 할 일이 같이 있었다. 둘을 갈랐으므로
 * 비어 있는 자리는 `지금 상태` 로 간다. **404 로 버리지 않는다**: 이
 * 주소가 적힌 자리가 밖에 남아 있을 수 있다.
 */
export default function Gap(): never {
  redirect("/me/state#gaps");
}

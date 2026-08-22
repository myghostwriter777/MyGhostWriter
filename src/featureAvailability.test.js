import { isAdminTester, isComingSoonForUser } from "./featureAvailability";

describe("coming-soon feature access", () => {
  test("holds Meeting and Manga for normal users regardless of their paid plan", () => {
    const masterUser = { plan: "student", isAdmin: false, allFeatures: false };
    expect(isComingSoonForUser("meeting", masterUser)).toBe(true);
    expect(isComingSoonForUser({ id: "manga" }, masterUser)).toBe(true);
  });

  test("keeps both modes open for permanent admin tester accounts", () => {
    const adminTester = { plan: "free", isAdmin: true, allFeatures: true };
    expect(isAdminTester(adminTester)).toBe(true);
    expect(isComingSoonForUser("meeting", adminTester)).toBe(false);
    expect(isComingSoonForUser("manga", adminTester)).toBe(false);
  });

  test("does not grant preview access from either admin flag alone", () => {
    expect(isComingSoonForUser("meeting", { isAdmin: true, allFeatures: false })).toBe(true);
    expect(isComingSoonForUser("manga", { isAdmin: false, allFeatures: true })).toBe(true);
  });

  test("does not affect released modes", () => {
    expect(isComingSoonForUser("slides", null)).toBe(false);
    expect(isComingSoonForUser("humanize", {})).toBe(false);
  });
});

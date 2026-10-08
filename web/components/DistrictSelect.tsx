"use client";

import { districtsByDivision } from "@/lib/locate";
import { useLang } from "@/lib/lang";
import { t } from "@/lib/i18n";

/** All 64 districts, grouped by division and sorted, in both languages. */
export function DistrictSelect({
  value, onChange, testId,
}: {
  value: string | null;
  onChange: (slug: string) => void;
  testId: string;
}) {
  const { lang } = useLang();
  const groups = districtsByDivision();
  const id = `${testId}-input`;
  return (
    <div>
      <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-low">
        {t("locate_district_label", lang)}
      </label>
      <select
        id={id}
        data-testid={testId}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-lg border border-line bg-inset px-2 text-sm text-ink-hi focus:border-action focus:outline-none"
      >
        <option value="" disabled>
          {t("locate_district_placeholder", lang)}
        </option>
        {groups.map((group) => (
          <optgroup key={group.division} label={lang === "bn" ? `${group.division_bn} বিভাগ` : group.division}>
            {group.districts.map((district) => (
              <option key={district.slug} value={district.slug}>
                {lang === "bn" ? `${district.name_bn} (${district.name_en})` : district.name_en}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}

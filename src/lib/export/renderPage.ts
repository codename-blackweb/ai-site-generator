import { getSectionTemplate } from "./sectionComponents";

type PageSection = {
  sectionId: string;
  content: unknown;
};

type PageDefinition = {
  pageId: string;
  sections: PageSection[];
};

const toPascalCase = (value: string) =>
  value
    .split(/[-_]/g)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

export const getPageComponentName = (pageId: string) => toPascalCase(pageId);

export const getPagePath = (pageId: string) => (pageId === "home" ? "/" : `/${pageId}`);

export const renderPage = (page: PageDefinition) => {
  const imports = new Set<string>([
    `import { visualSystem } from "../design/visualSystem";`,
    `import { siteMedia } from "../design/siteMedia";`,
    `import { Section } from "../components/Section";`,
  ]);

  const sectionBlocks = page.sections
    .map((section) => {
      const template = getSectionTemplate(section.sectionId);
      if (!template) {
        throw new Error(`Missing section renderer for ${section.sectionId}`);
      }
      imports.add(`import { ${template.componentName} } from "../sections/${template.componentName}";`);
      const contentLiteral = JSON.stringify(section.content ?? {}, null, 2);
      return `      <Section>
        <${template.componentName} content={${contentLiteral}} visualSystem={visualSystem} media={siteMedia} />
      </Section>`;
    })
    .join("\n");

  const pageName = getPageComponentName(page.pageId);

  return `${Array.from(imports).join("\n")}

export default function ${pageName}() {
  return (
    <main>
${sectionBlocks}
    </main>
  );
}
`;
};

import { IfaResultBlank } from "./IfaResultBlank";

interface Props {
  clientName: string;
  birthYear: string;
  address: string;
}

export const TrichomonasCandidaBlank = ({ clientName, birthYear, address }: Props) => (
  <IfaResultBlank
    title="Trichomonas / Candida IFA tahlili"
    formNumber="291"
    markers={[
      { label: "Trichomonas - IgM" },
      { label: "Trichomonas - IgG" },
      { label: "Candida - IgM" },
      { label: "Candida - IgG" },
    ]}
    clientName={clientName}
    birthYear={birthYear}
    address={address}
  />
);

export default TrichomonasCandidaBlank;

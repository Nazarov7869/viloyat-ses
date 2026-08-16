import { IfaResultBlank } from "./IfaResultBlank";

interface Props {
  clientName: string;
  birthYear: string;
  address: string;
}

export const EchinokokkBlank = ({ clientName, birthYear, address }: Props) => (
  <IfaResultBlank
    title="Exinokokk IFA tahlili"
    formNumber="291"
    markers={[
      { label: "Эхинококк - IgM" },
      { label: "Эхинококк - IgG" },
    ]}
    clientName={clientName}
    birthYear={birthYear}
    address={address}
  />
);

export default EchinokokkBlank;

import { IfaResultBlank } from "./IfaResultBlank";

interface Props {
  clientName: string;
  birthYear: string;
  address: string;
}

export const BrutsellozIfaBlank = ({ clientName, birthYear, address }: Props) => (
  <IfaResultBlank
    title="Bruselloz IFA tahlili"
    formNumber="291"
    markers={[
      { label: "Brutsella - IgM", norm: "1.0" },
      { label: "Brutsella - IgG", norm: "1.0" },
    ]}
    clientName={clientName}
    birthYear={birthYear}
    address={address}
  />
);

export default BrutsellozIfaBlank;

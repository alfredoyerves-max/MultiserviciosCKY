"use client";

import { useActionState, useState } from "react";
import { saveSystemConfigAction, type ConfigActionState } from "./actions";
import { FiscalSectionHeader } from "./fiscal-lock";
import { Field, FieldError, FieldLabel, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SystemConfig } from "@/generated/prisma/client";
import type { CeavBandaInput } from "@/lib/costEngine";

const initialState: ConfigActionState = { ok: false };

function toPctDisplay(fraction: number) {
  return String(Math.round(fraction * 10000) / 100);
}

export function ConfigForm({
  config,
  bandasCeav,
}: {
  config: SystemConfig;
  bandasCeav: CeavBandaInput[];
}) {
  const [state, formAction, pending] = useActionState(saveSystemConfigAction, initialState);
  const [fiscalUnlocked, setFiscalUnlocked] = useState(false);
  // Se reenvía como campo oculto para que el servidor la vuelva a
  // verificar al guardar (defensa en profundidad — ver saveSystemConfigAction).
  const [fiscalPassword, setFiscalPassword] = useState("");

  function handleUnlock(password: string) {
    setFiscalUnlocked(true);
    setFiscalPassword(password);
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <input type="hidden" name="fiscalPassword" value={fiscalPassword} />

      <FiscalSection
        title="UMA, salario mínimo y tope salarial"
        hint="Normativo — cambia por ley cada año."
        unlocked={fiscalUnlocked}
        onUnlock={handleUnlock}
      >
        <NumField locked={!fiscalUnlocked} name="umaDiaria" label="UMA diaria ($)" defaultValue={config.umaDiaria} error={state.fieldErrors?.umaDiaria} step="0.01" />
        <NumField locked={!fiscalUnlocked} name="umaMensual" label="UMA mensual ($)" defaultValue={config.umaMensual} error={state.fieldErrors?.umaMensual} step="0.01" />
        <NumField locked={!fiscalUnlocked} name="topeSbcUmas" label="Tope SBC (múltiplo de UMA)" defaultValue={config.topeSbcUmas} error={state.fieldErrors?.topeSbcUmas} step="1" />
        <NumField locked={!fiscalUnlocked} name="salarioMinimoDiario" label="Salario mínimo diario ($)" defaultValue={config.salarioMinimoDiario} error={state.fieldErrors?.salarioMinimoDiario} step="0.01" />
        <NumField locked={!fiscalUnlocked} name="salarioMinimoMensual" label="Salario mínimo mensual ($)" defaultValue={config.salarioMinimoMensual} error={state.fieldErrors?.salarioMinimoMensual} step="0.01" />
      </FiscalSection>

      <FiscalSection
        title="Tabla CEAV — Cesantía y Vejez por banda de SBC"
        hint="Cuota patronal según en qué banda cae el SBC mensual del trabajador (Reforma LSS/LSAR, DOF 16-dic-2020). Sube cada enero hasta 2030."
        unlocked={fiscalUnlocked}
        onUnlock={handleUnlock}
        bare
      >
        <CeavBandasTable bandas={bandasCeav} locked={!fiscalUnlocked} />
      </FiscalSection>

      <FiscalSection
        title="IMSS (cuotas normativas)"
        hint="Todos en % del SBC, salvo donde se indica. La prima de riesgo es un dato de negocio y se edita aparte, sin candado."
        unlocked={fiscalUnlocked}
        onUnlock={handleUnlock}
      >
        <NumField locked={!fiscalUnlocked} name="imssEnfMatCuotaFijaPct" label="Enf. y maternidad — cuota fija (% de 1 UMA mensual)" defaultValue={toPctDisplay(config.imssEnfMatCuotaFijaPct)} error={state.fieldErrors?.imssEnfMatCuotaFijaPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="imssEnfMatCuotaAdicPct" label="Enf. y maternidad — cuota adicional (% excedente sobre 3 UMA)" defaultValue={toPctDisplay(config.imssEnfMatCuotaAdicPct)} error={state.fieldErrors?.imssEnfMatCuotaAdicPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="imssEnfMatDineroPct" label="Enf. y maternidad — en dinero (%)" defaultValue={toPctDisplay(config.imssEnfMatDineroPct)} error={state.fieldErrors?.imssEnfMatDineroPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="imssGastosMedPensPct" label="Gastos médicos pensionados (%)" defaultValue={toPctDisplay(config.imssGastosMedPensPct)} error={state.fieldErrors?.imssGastosMedPensPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="imssInvalidezVidaPct" label="Invalidez y vida (%)" defaultValue={toPctDisplay(config.imssInvalidezVidaPct)} error={state.fieldErrors?.imssInvalidezVidaPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="imssGuarderiasPct" label="Guarderías y prestaciones sociales (%)" defaultValue={toPctDisplay(config.imssGuarderiasPct)} error={state.fieldErrors?.imssGuarderiasPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="imssRetiroPct" label="Retiro — RCV (%)" defaultValue={toPctDisplay(config.imssRetiroPct)} error={state.fieldErrors?.imssRetiroPct} suffix="%" />
      </FiscalSection>

      <FiscalSection
        title="INFONAVIT, ISN e impuestos estatales"
        unlocked={fiscalUnlocked}
        onUnlock={handleUnlock}
      >
        <NumField locked={!fiscalUnlocked} name="infonavitPct" label="INFONAVIT (% del SBC)" defaultValue={toPctDisplay(config.infonavitPct)} error={state.fieldErrors?.infonavitPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="isnPct" label="ISN Campeche (% de la nómina)" defaultValue={toPctDisplay(config.isnPct)} error={state.fieldErrors?.isnPct} suffix="%" />
        <NumField locked={!fiscalUnlocked} name="impuestoAdicionalPct" label="Impuesto adicional Cultura/Infraestructura/Deporte (% del ISN)" defaultValue={toPctDisplay(config.impuestoAdicionalPct)} error={state.fieldErrors?.impuestoAdicionalPct} suffix="%" />
      </FiscalSection>

      <Section title="Prima de riesgo (negocio)" hint="Dato de negocio de la empresa — editable sin candado.">
        <NumField name="primaRiesgoPct" label="Prima de riesgo de trabajo (%)" defaultValue={toPctDisplay(config.primaRiesgoPct)} error={state.fieldErrors?.primaRiesgoPct} />
      </Section>

      <Section title="Prestaciones">
        <NumField name="diasAguinaldo" label="Días de aguinaldo" defaultValue={config.diasAguinaldo} error={state.fieldErrors?.diasAguinaldo} step="1" />
        <NumField name="diasVacaciones" label="Días de vacaciones (año 1)" defaultValue={config.diasVacaciones} error={state.fieldErrors?.diasVacaciones} step="1" />
        <NumField name="primaVacacionalPct" label="Prima vacacional (%)" defaultValue={toPctDisplay(config.primaVacacionalPct)} error={state.fieldErrors?.primaVacacionalPct} />
      </Section>

      <Section title="Fiscal (cotización)">
        <NumField name="ivaPct" label="IVA (%)" defaultValue={toPctDisplay(config.ivaPct)} error={state.fieldErrors?.ivaPct} />
        <NumField name="retencionIsrPct" label="Retención ISR RESICO Art. 113-J (%, solo Persona Moral)" defaultValue={toPctDisplay(config.retencionIsrPct)} error={state.fieldErrors?.retencionIsrPct} />
      </Section>

      <Section title="Jornada laboral">
        <NumField name="horasPorDia" label="Horas por día laboral" defaultValue={config.horasPorDia} error={state.fieldErrors?.horasPorDia} step="1" />
        <NumField name="diasPorSemana" label="Días por semana laboral" defaultValue={config.diasPorSemana} error={state.fieldErrors?.diasPorSemana} step="1" />
      </Section>

      <Section title="Margen de utilidad">
        <NumField name="margenUtilidadDefaultPct" label="Margen de utilidad por defecto (%)" defaultValue={toPctDisplay(config.margenUtilidadDefaultPct)} error={state.fieldErrors?.margenUtilidadDefaultPct} />
      </Section>

      <Section
        title="Datos del prestador de servicio"
        hint="Solo se usan en el membrete de las cotizaciones exportadas a Word/PDF — no participan en ningún cálculo."
      >
        <Field>
          <FieldLabel htmlFor="prestadorNombre">Nombre / razón social</FieldLabel>
          <Input id="prestadorNombre" name="prestadorNombre" defaultValue={config.prestadorNombre} required />
          <FieldError>{state.fieldErrors?.prestadorNombre}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor="prestadorRfc">RFC (opcional)</FieldLabel>
          <Input id="prestadorRfc" name="prestadorRfc" defaultValue={config.prestadorRfc ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="prestadorTelefono">Teléfono (opcional)</FieldLabel>
          <Input id="prestadorTelefono" name="prestadorTelefono" defaultValue={config.prestadorTelefono ?? ""} />
        </Field>
        <Field>
          <FieldLabel htmlFor="prestadorEmail">Correo (opcional)</FieldLabel>
          <Input id="prestadorEmail" name="prestadorEmail" defaultValue={config.prestadorEmail ?? ""} />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="prestadorDireccion">Dirección (opcional)</FieldLabel>
          <Textarea id="prestadorDireccion" name="prestadorDireccion" defaultValue={config.prestadorDireccion ?? ""} />
        </Field>
      </Section>

      {state.error && (
        <p className="text-sm text-danger">{state.error}</p>
      )}
      {state.ok && (
        <p className="text-sm text-success-soft">Configuración guardada.</p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <CardTitle>{title}</CardTitle>
        {hint && <p className="text-xs text-text-dim">{hint}</p>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  );
}

/** Igual que Section, pero con candado de contraseña en el header. */
function FiscalSection({
  title,
  hint,
  unlocked,
  onUnlock,
  bare = false,
  children,
}: {
  title: string;
  hint?: string;
  unlocked: boolean;
  onUnlock: (password: string) => void;
  /** true = sin el grid de 2 columnas (para tablas, ej. bandas CEAV). */
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={unlocked ? undefined : "border-border"}>
      <FiscalSectionHeader title={title} hint={hint} unlocked={unlocked} onUnlock={onUnlock} />
      <CardContent>
        {bare ? children : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

function CeavBandasTable({ bandas, locked }: { bandas: CeavBandaInput[]; locked: boolean }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
          <th className="py-2 pr-3 font-medium">Banda</th>
          <th className="py-2 pr-3 font-medium">Referencia</th>
          <th className="py-2 text-right font-medium">Cuota patronal</th>
        </tr>
      </thead>
      <tbody>
        {bandas.map((banda) => {
          const name = `ceavPct_${banda.orden}`;
          const defaultValue = toPctDisplay(banda.porcentajePatronal);
          return (
            <tr key={banda.orden} className="border-b border-border last:border-0">
              <td className="py-2 pr-3 text-text">{banda.etiqueta}</td>
              <td className="py-2 pr-3 text-text-dim">
                {banda.unidadLimite === "SALARIO_MINIMO" ? "Salario mínimo" : "UMA"}
              </td>
              <td className="py-2 text-right">
                {locked ? (
                  <span className="font-mono tabular-nums text-text-muted">{defaultValue}%</span>
                ) : (
                  <Input
                    name={name}
                    type="number"
                    step="0.001"
                    defaultValue={defaultValue}
                    className="ml-auto h-9 w-28 text-right"
                    required
                  />
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function NumField({
  name,
  label,
  defaultValue,
  error,
  step = "0.0001",
  allowEmpty = false,
  locked = false,
  suffix = "",
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  error?: string;
  step?: string;
  allowEmpty?: boolean;
  locked?: boolean;
  suffix?: string;
}) {
  if (locked) {
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <div className="flex h-10 items-center rounded-lg border border-border bg-surface px-3 text-sm text-text-muted">
          {defaultValue}
          {suffix}
        </div>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        required={!allowEmpty}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

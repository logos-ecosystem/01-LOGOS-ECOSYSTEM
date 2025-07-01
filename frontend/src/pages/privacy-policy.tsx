import React from 'react';
import { NextPage } from 'next';
import {
  Container,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Link,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PrivacyPolicy: NextPage = () => {
  const lastUpdated = new Date('2024-01-01');

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Política de Privacidad
        </Typography>
        
        <Typography variant="body2" color="text.secondary" paragraph>
          Última actualización: {format(lastUpdated, 'dd \'de\' MMMM \'de\' yyyy', { locale: es })}
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          1. Introducción
        </Typography>
        <Typography paragraph>
          En LOGOS Ecosystem ("nosotros", "nuestro" o "la empresa"), nos comprometemos a proteger 
          tu privacidad y datos personales. Esta Política de Privacidad explica cómo 
          recopilamos, usamos, compartimos y protegemos tu información cuando utilizas 
          nuestros servicios.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          2. Responsable del Tratamiento
        </Typography>
        <Typography paragraph>
          <strong>LOGOS Ecosystem Inc.</strong><br />
          123 Tech Street, Tech City, TC 12345<br />
          Email: privacy@logos-ecosystem.com<br />
          DPO: dpo@logos-ecosystem.com
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          3. Datos que Recopilamos
        </Typography>
        
        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          3.1 Datos que nos proporcionas
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Información de cuenta"
              secondary="Nombre, email, nombre de usuario, contraseña (encriptada)"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Información de pago"
              secondary="Datos de tarjeta (tokenizados por Stripe), dirección de facturación"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Comunicaciones"
              secondary="Mensajes de soporte, feedback, preferencias"
            />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
          3.2 Datos que recopilamos automáticamente
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Datos de uso"
              secondary="Interacciones con la plataforma, configuraciones, preferencias"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Datos técnicos"
              secondary="Dirección IP, tipo de navegador, sistema operativo, dispositivo"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Cookies y tecnologías similares"
              secondary="Ver nuestra Política de Cookies para más información"
            />
          </ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          4. Base Legal y Propósitos
        </Typography>
        
        <TableContainer sx={{ mt: 2 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>Propósito</strong></TableCell>
                <TableCell><strong>Base Legal</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>Proporcionar nuestros servicios</TableCell>
                <TableCell>Contrato</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Procesar pagos</TableCell>
                <TableCell>Contrato</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Comunicaciones de servicio</TableCell>
                <TableCell>Contrato / Interés legítimo</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Marketing (si has consentido)</TableCell>
                <TableCell>Consentimiento</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Cumplimiento legal</TableCell>
                <TableCell>Obligación legal</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Seguridad y prevención de fraude</TableCell>
                <TableCell>Interés legítimo</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          5. Compartir Datos
        </Typography>
        <Typography paragraph>
          Compartimos tus datos solo en las siguientes circunstancias:
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Proveedores de servicios"
              secondary="Stripe (pagos), AWS (hosting), SendGrid (emails)"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Requerimientos legales"
              secondary="Cuando sea requerido por ley o proceso judicial"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Con tu consentimiento"
              secondary="Cuando nos hayas dado permiso explícito"
            />
          </ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          6. Transferencias Internacionales
        </Typography>
        <Typography paragraph>
          Tus datos pueden ser transferidos y procesados fuera del EEE. Cuando esto 
          ocurre, nos aseguramos de que existan salvaguardas apropiadas, como:
        </Typography>
        <List>
          <ListItem>• Cláusulas contractuales estándar de la UE</ListItem>
          <ListItem>• Certificación Privacy Shield (donde aplique)</ListItem>
          <ListItem>• Decisiones de adecuación de la Comisión Europea</ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          7. Retención de Datos
        </Typography>
        <Typography paragraph>
          Retenemos tus datos solo mientras sea necesario para los propósitos descritos:
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Datos de cuenta"
              secondary="3 años después del cierre de cuenta"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Registros de transacciones"
              secondary="7 años por requerimientos fiscales"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Comunicaciones de soporte"
              secondary="3 años después del cierre del ticket"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Logs de seguridad"
              secondary="1 año"
            />
          </ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          8. Tus Derechos (GDPR)
        </Typography>
        <Typography paragraph>
          Bajo el GDPR, tienes los siguientes derechos:
        </Typography>
        <List>
          <ListItem>
            <ListItemText 
              primary="Derecho de acceso"
              secondary="Obtener una copia de tus datos personales"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Derecho de rectificación"
              secondary="Corregir datos inexactos o incompletos"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Derecho de supresión"
              secondary="Solicitar la eliminación de tus datos ('derecho al olvido')"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Derecho de portabilidad"
              secondary="Recibir tus datos en formato estructurado"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Derecho de oposición"
              secondary="Oponerte a ciertos procesamientos"
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="Derecho de limitación"
              secondary="Restringir el procesamiento en ciertas circunstancias"
            />
          </ListItem>
        </List>
        
        <Typography paragraph sx={{ mt: 2 }}>
          Para ejercer estos derechos, visita tu <Link href="/account/privacy">
          configuración de privacidad</Link> o contacta a privacy@logos-ecosystem.com.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          9. Seguridad
        </Typography>
        <Typography paragraph>
          Implementamos medidas técnicas y organizativas apropiadas para proteger 
          tus datos, incluyendo:
        </Typography>
        <List>
          <ListItem>• Encriptación en tránsito (TLS) y en reposo</ListItem>
          <ListItem>• Acceso restringido basado en roles</ListItem>
          <ListItem>• Monitoreo continuo de seguridad</ListItem>
          <ListItem>• Auditorías regulares de seguridad</ListItem>
          <ListItem>• Capacitación del personal en protección de datos</ListItem>
        </List>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          10. Menores de Edad
        </Typography>
        <Typography paragraph>
          Nuestros servicios no están dirigidos a menores de 16 años. No recopilamos 
          conscientemente datos de menores. Si descubres que un menor nos ha 
          proporcionado datos, contáctanos inmediatamente.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          11. Cambios a esta Política
        </Typography>
        <Typography paragraph>
          Podemos actualizar esta política ocasionalmente. Te notificaremos sobre 
          cambios significativos por email o mediante un aviso prominente en nuestro 
          servicio.
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
          12. Contacto
        </Typography>
        <Typography paragraph>
          Para preguntas sobre esta política o tus datos personales:
        </Typography>
        <Box sx={{ bgcolor: 'background.default', p: 2, borderRadius: 1 }}>
          <Typography>
            <strong>Delegado de Protección de Datos (DPO)</strong><br />
            Email: dpo@logos-ecosystem.com<br />
            Teléfono: +1-555-PRIVACY<br />
            Dirección: 123 AI Street, Tech City, TC 12345
          </Typography>
        </Box>

        <Typography paragraph sx={{ mt: 3 }}>
          También tienes derecho a presentar una queja ante tu autoridad supervisora 
          local de protección de datos.
        </Typography>

        <Divider sx={{ my: 4 }} />

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Link href="/cookie-policy" sx={{ mx: 2 }}>
            Política de Cookies
          </Link>
          <Link href="/terms" sx={{ mx: 2 }}>
            Términos de Servicio
          </Link>
          <Link href="/account/privacy" sx={{ mx: 2 }}>
            Configuración de Privacidad
          </Link>
        </Box>
      </Paper>
    </Container>
  );
};

export default PrivacyPolicy;
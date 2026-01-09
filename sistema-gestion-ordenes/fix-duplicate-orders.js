// Script para corregir el código que crea múltiples órdenes
// Ejecutar con: node fix-duplicate-orders.js

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'react', 'components', 'OrderForm.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Buscar y reemplazar el código viejo que crea múltiples órdenes
  const oldCodePattern = /\/\/ Crear una orden por cada equipo[\s\S]*?createdOrders\.push\(order\);\s*}/;
  
  const newCode = `// === CREAR UNA SOLA ORDEN CON TODOS LOS EQUIPOS ===
      // El primer equipo es el principal (se almacena en campos normales)
      // Los equipos adicionales se almacenan en devices_data (JSONB)
      const firstDevice = devices[0];
      
      // Calcular totales combinados de todos los equipos
      const totalReplacementCost = devices.reduce((sum, d) => sum + d.replacementCost, 0);
      const totalLaborCost = devices.reduce((sum, d) => sum + d.serviceValue, 0);
      const totalRepairCost = totalReplacementCost + totalLaborCost;
      
      // Preparar equipos adicionales (desde el segundo en adelante) para almacenar en JSONB
      const additionalDevices = devices.slice(1).map(device => ({
        device_type: device.deviceType || "iphone",
        device_model: device.deviceModel,
        device_serial_number: device.deviceSerial || null,
        device_unlock_code: device.unlockType === "code" ? device.deviceUnlockCode : null,
        device_unlock_pattern: device.unlockType === "pattern" && device.deviceUnlockPattern.length > 0 
          ? device.deviceUnlockPattern 
          : null,
        problem_description: device.problemDescription,
        checklist_data: device.checklistData || {},
        replacement_cost: device.replacementCost,
        labor_cost: device.serviceValue,
        selected_services: device.selectedServices.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description || null,
          quantity: 1,
          unit_price: device.serviceValue,
          total_price: device.serviceValue,
        })),
      }));

      // Preparar datos de inserción para la orden única
      const orderData: any = {
        order_number: null,
        customer_id: selectedCustomer.id,
        technician_id: actualTechnicianId,
        sucursal_id: sucursalId,
        device_type: firstDevice.deviceType || "iphone",
        device_model: firstDevice.deviceModel,
        device_serial_number: firstDevice.deviceSerial || null,
        device_unlock_code: firstDevice.unlockType === "code" ? firstDevice.deviceUnlockCode : null,
        problem_description: firstDevice.problemDescription,
        checklist_data: firstDevice.checklistData,
        replacement_cost: totalReplacementCost,
        labor_cost: totalLaborCost,
        total_repair_cost: totalRepairCost,
        priority,
        commitment_date: commitmentDate || null,
        warranty_days: warrantyDays,
        status: "en_proceso",
        ...(additionalDevices.length > 0 ? { devices_data: additionalDevices } : {}),
      };

      if (firstDevice.unlockType === "pattern" && firstDevice.deviceUnlockPattern.length > 0) {
        orderData.device_unlock_pattern = firstDevice.deviceUnlockPattern;
      }

      const { data: order, error: orderError } = await supabase
        .from("work_orders")
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      for (const service of firstDevice.selectedServices) {
        await supabase.from("order_services").insert({
          order_id: order.id,
          service_id: service.id,
          service_name: service.name,
          quantity: 1,
          unit_price: firstDevice.serviceValue,
          total_price: firstDevice.serviceValue,
          description: service.description || null,
        });
      }

      for (const additionalDevice of additionalDevices) {
        for (const service of additionalDevice.selected_services) {
          await supabase.from("order_services").insert({
            order_id: order.id,
            service_id: service.id,
            service_name: service.name,
            quantity: 1,
            unit_price: service.unit_price,
            total_price: service.total_price,
            description: service.description || null,
          });
        }
      }

      const createdOrders = [order];`;

  if (oldCodePattern.test(content)) {
    content = content.replace(oldCodePattern, newCode);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Código corregido exitosamente');
  } else {
    console.log('⚠️ No se encontró el código viejo. Puede que ya esté corregido.');
  }
  
  // Corregir el botón
  content = content.replace(
    /`Crear \$\{devices\.length === 1 \? 'Orden' : `\$\{devices\.length\} Órdenes`\}`/g,
    '`Crear Orden${devices.length > 1 ? ` (${devices.length} equipos)` : \'\'}`'
  );
  
  // Corregir el alert
  content = content.replace(
    /const ordersCount = createdOrders\.length;\s*alert\(`Se \$\{ordersCount === 1 \? 'creó' : 'crearon'\} \$\{ordersCount\} orden\$\{ordersCount === 1 \? '' : 'es'\} exitosamente\. Se abrirá la vista previa del PDF del primer equipo\.`\);/,
    'const devicesCount = devices.length;\n      alert(`Orden creada exitosamente con ${devicesCount} equipo${devicesCount === 1 ? \'\' : \'s\'}. Se abrirá la vista previa del PDF.`);'
  );
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Botón y alert corregidos');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}

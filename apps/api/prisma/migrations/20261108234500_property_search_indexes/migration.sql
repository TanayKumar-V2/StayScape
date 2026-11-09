-- CreateIndex
CREATE INDEX "properties_state_idx" ON "properties"("state");

-- CreateIndex
CREATE INDEX "properties_country_idx" ON "properties"("country");

-- CreateIndex
CREATE INDEX "properties_status_published_at_idx" ON "properties"("status", "published_at");

-- CreateIndex
CREATE INDEX "properties_status_property_type_idx" ON "properties"("status", "property_type");

-- CreateIndex
CREATE INDEX "properties_status_price_per_night_paise_idx" ON "properties"("status", "price_per_night_paise");

-- CreateIndex
CREATE INDEX "properties_status_city_idx" ON "properties"("status", "city");

-- CreateIndex
CREATE INDEX "property_amenities_amenity_id_idx" ON "property_amenities"("amenity_id");

